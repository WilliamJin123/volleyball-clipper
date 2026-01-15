import pytest
from unittest.mock import MagicMock, patch, call

# Import the logic to test (conftest.py adds video_clipping to path)
from services.indexer import create_index_and_task, check_status, background_index_processor

# --- TEST 1: create_index_and_task ---

@patch("services.indexer.time")
@patch("services.indexer.tl_client")
@patch("services.indexer.get_public_url")
def test_create_index_and_task_flow(mock_get_url, mock_tl_client, mock_time):
    """
    Verifies that we generate a URL, create an index, create an asset,
    and trigger the indexing task in the correct order.
    """
    # 1. Setup Mocks
    mock_get_url.return_value = "http://r2-public-url.com/game.mp4"
    mock_time.time.return_value = 1234567890

    # Mock Index creation return
    mock_index = MagicMock()
    mock_index.id = "idx_123"
    mock_tl_client.indexes.create.return_value = mock_index

    # Mock Asset creation return
    mock_asset = MagicMock()
    mock_asset.id = "asset_456"
    mock_tl_client.assets.create.return_value = mock_asset

    # Mock Indexed Asset (Task) return
    mock_task = MagicMock()
    mock_task.id = "task_789" # Usually same as asset_id in TL, but treating as obj here
    mock_tl_client.indexes.indexed_assets.create.return_value = mock_task

    # 2. Run
    index_id, asset_id = create_index_and_task("game.mp4")

    # 3. Assertions
    # Check R2 URL generation
    mock_get_url.assert_called_with("game.mp4")

    # Check Index Creation (now includes timestamp)
    mock_tl_client.indexes.create.assert_called_once()
    assert mock_tl_client.indexes.create.call_args.kwargs['index_name'] == "volleyball_game.mp4_1234567890"

    # Check Asset Creation (linking video to index)
    mock_tl_client.assets.create.assert_called_with(
        method="url",
        url="http://r2-public-url.com/game.mp4",
        filename="game.mp4"
    )

    # Check Task Trigger
    mock_tl_client.indexes.indexed_assets.create.assert_called_with(
        index_id="idx_123",
        asset_id="asset_456"
    )

    assert index_id == "idx_123"
    assert asset_id == "task_789"


# --- TEST 2: background_index_processor (The Polling Logic) ---

@patch("services.indexer.time.sleep") # Don't actually sleep in tests
@patch("services.indexer.supabase")
@patch("services.indexer.check_status")
@patch("services.indexer.create_index_and_task")
def test_background_processor_success(mock_create, mock_check, mock_supabase, mock_sleep):
    """
    Simulates a successful flow: 
    Start -> Update DB (Processing) -> Wait (Pending) -> Wait (Ready) -> Update DB (Ready).
    """
    # 1. Setup Mocks
    mock_create.return_value = ("idx_123", "asset_456")
    
    # Simulate Polling: First return "pending", then "ready"
    status_pending = MagicMock()
    status_pending.status = "pending"
    
    status_ready = MagicMock()
    status_ready.status = "ready"
    status_ready.id = "asset_456"

    # .side_effect makes the mock return different values on consecutive calls
    mock_check.side_effect = [status_pending, status_ready]

    # Mock Supabase chain: table().update().eq().execute()
    # We need to ensure .execute() is callable without crashing
    mock_query = mock_supabase.table.return_value.update.return_value.eq.return_value

    # 2. Run
    background_index_processor("game.mp4", "db_video_uuid")

    # 3. Assertions
    
    # A. Check Initial DB Update (Processing)
    # We check the arguments passed to update()
    mock_supabase.table.assert_called_with("videos")
    mock_supabase.table().update.assert_any_call({"status": "processing"})
    
    # B. Check Polling Logic
    # Should have called check_status twice (pending, then ready)
    assert mock_check.call_count == 2
    
    # C. Check Final DB Update (Ready + IDs)
    expected_update = {
        "status": "ready",
        "twelvelabs_index_id": "idx_123",
        "twelvelabs_video_id": "asset_456"
    }
    # Verify the FINAL update call contained these values
    # Note: call_args_list captures all calls. We want to find the one with "ready"
    calls = mock_supabase.table().update.call_args_list
    assert any(call(expected_update) in calls for call in calls)


@patch("services.indexer.time.sleep")
@patch("services.indexer.supabase")
@patch("services.indexer.check_status")
@patch("services.indexer.create_index_and_task")
def test_background_processor_failure_from_tl(mock_create, mock_check, mock_supabase, mock_sleep):
    """
    Simulates a failure from Twelve Labs:
    Start -> Update DB -> TL says 'failed' -> Update DB (Failed).
    """
    mock_create.return_value = ("idx_123", "asset_456")
    
    status_failed = MagicMock()
    status_failed.status = "failed"
    mock_check.return_value = status_failed

    background_index_processor("game.mp4", "db_video_uuid")

    # Check that we updated DB to 'failed'
    mock_supabase.table().update.assert_called_with({"status": "failed"})

@patch("services.indexer.time.sleep")
@patch("services.indexer.supabase")
@patch("services.indexer.create_index_and_task")
def test_background_processor_exception(mock_create, mock_supabase, mock_sleep):
    """
    Simulates an exception (e.g., Network Error) during the setup phase.
    """
    # Force an error immediately
    mock_create.side_effect = Exception("API Down")

    background_index_processor("game.mp4", "db_video_uuid")

    # Should catch exception and update DB to 'failed'
    mock_supabase.table().update.assert_called_with({"status": "failed"})