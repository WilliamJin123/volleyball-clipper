import pytest
import json
from unittest.mock import MagicMock, patch

from ...video_clipping.services.slicer import analyze_video, cut_and_upload

# --- TEST 1: analyze_video ---

@patch("services.slicer.tl_client")
def test_analyze_video_success(mock_tl_client):
    """
    Test that analyze_video correctly parses the JSON response from Twelve Labs.
    """
    # 1. Setup Mock Response
    mock_response = MagicMock()
    # The API returns a stringified JSON inside .data
    fake_data = {
        "segments": [
            {"start": 10.5, "end": 15.0},
            {"start": 30.0, "end": 35.0}
        ]
    }
    mock_response.data = json.dumps(fake_data)
    mock_tl_client.analyze.return_value = mock_response

    # 2. Run Function
    result = analyze_video("test_video_id", "test query")

    # 3. Assertions
    assert len(result) == 2
    assert result[0]["start"] == 10.5
    assert result[1]["end"] == 35.0
    
    # Verify the client was called with correct params
    mock_tl_client.analyze.assert_called_once()
    call_args = mock_tl_client.analyze.call_args
    assert call_args.kwargs["video_id"] == "test_video_id"
    assert call_args.kwargs["query"] == "test query"

@patch("services.slicer.tl_client")
def test_analyze_video_empty(mock_tl_client):
    """
    Test behavior when no segments are found.
    """
    mock_response = MagicMock()
    mock_response.data = json.dumps({"segments": []})
    mock_tl_client.analyze.return_value = mock_response

    result = analyze_video("test_video_id", "nothing here")
    assert result == []


# --- TEST 2: cut_and_upload ---

@patch("services.slicer.os.remove")  # Mock file deletion
@patch("services.slicer.s3_client")  # Mock S3
@patch("services.slicer.ffmpeg")     # Mock FFmpeg
@patch("services.slicer.get_presigned_url") # Mock the common helper
def test_cut_and_upload_logic(mock_get_url, mock_ffmpeg, mock_s3, mock_remove):
    """
    Test that the loop calculates times correctly, calls ffmpeg, and "uploads" files.
    """
    # 1. Setup Mocks
    mock_get_url.return_value = "http://signed-url.com/video.mp4"
    mock_s3.generate_presigned_url.return_value = "http://public-clip.com"
    
    # Mock FFmpeg chain: .input().output().overwrite_output().run()
    # We need to return a Mock object at each step so the chain doesn't break
    mock_stream = MagicMock()
    mock_ffmpeg.input.return_value = mock_stream
    mock_stream.output.return_value = mock_stream
    mock_stream.overwrite_output.return_value = mock_stream
    
    # 2. Define Inputs
    segments = [{"start": 10.0, "end": 20.0}] # 10s clip
    padding = 2.0
    job_id = "job_123"
    filename = "game.mp4"

    # 3. Run Function
    results = cut_and_upload(filename, segments, padding, job_id)

    # 4. Assertions
    
    # A. Check Timing Logic (10 - 2 = 8, 20 + 2 = 22)
    assert len(results) == 1
    clip = results[0]
    assert clip["start_time"] == 8.0
    assert clip["end_time"] == 22.0
    assert clip["job_id"] == job_id
    
    # B. Check FFmpeg calls
    # Input should define start (ss) and duration (t)
    # duration = 22 - 8 = 14
    mock_ffmpeg.input.assert_called_with("http://signed-url.com/video.mp4", ss=8.0, t=14.0)
    
    # Output should use a temp path
    output_args = mock_stream.output.call_args
    assert "/tmp/clip_job_123_0.mp4" in output_args[0]
    
    # C. Check S3 Upload
    mock_s3.upload_file.assert_called_once()
    upload_args = mock_s3.upload_file.call_args
    # args: (local_file, bucket, remote_key)
    assert upload_args[0][0] == "/tmp/clip_job_123_0.mp4"
    assert upload_args[0][2] == "clips/job_123/clip_job_123_0.mp4"
    
    # D. Check Cleanup
    mock_remove.assert_called_with("/tmp/clip_job_123_0.mp4")

@patch("services.slicer.os.remove")
@patch("services.slicer.s3_client")
@patch("services.slicer.ffmpeg")
@patch("services.slicer.get_presigned_url")
def test_cut_and_upload_error_handling(mock_get_url, mock_ffmpeg, mock_s3, mock_remove):
    """
    Test that one failed clip doesn't crash the whole batch.
    """
    segments = [
        {"start": 10, "end": 20}, # Valid
        {"start": 30, "end": 40}  # Will fail
    ]
    
    # Make ffmpeg raise an error on the SECOND call only
    # We set side_effect on the .run() method of the chain
    mock_stream = MagicMock()
    mock_ffmpeg.input.return_value = mock_stream
    mock_stream.output.return_value = mock_stream
    mock_stream.overwrite_output.return_value = mock_stream
    
    # First call succeeds, Second call raises Error
    mock_stream.run.side_effect = [None, Exception("FFmpeg failed")]

    results = cut_and_upload("video.mp4", segments, 0, "job_abc")

    # Should return result for the first one, but skip the second
    assert len(results) == 1
    assert results[0]["start_time"] == 10
    
    # Verify run was actually attempted twice
    assert mock_stream.run.call_count == 2