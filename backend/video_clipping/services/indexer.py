# backend/services/indexer.py
import time
from twelvelabs import Asset, IndexesCreateRequestModelsItem
from .common import tl_client, get_presigned_url, supabase

def create_index_and_task(video_filename: str, index_name: str = None):
    """
    1. Generates R2 signed URL
    2. Creates a Twelve Labs Index
    3. Starts the indexing task
    Returns: The new Index ID and the Asset ID (Task)
    """
    if not index_name:
        index_name = f"volleyball_{video_filename}"

    # 1. Get URL for Twelve Labs to download
    presigned_url = get_presigned_url(video_filename)

    print(f"[Indexer] Creating index '{index_name}'...")
    # 2. Create Index
    index = tl_client.indexes.create(
        index_name=index_name,
        models=[
            IndexesCreateRequestModelsItem(
                model_name="marengo2.6", model_options=["visual", "audio", "conversation"]
            ),
            IndexesCreateRequestModelsItem(
                model_name="pegasus1.1", model_options=["visual", "audio"]
            ),
        ],
        addons=["thumbnail"] 
    )

    # 3. Create Asset (Link video to index)
    print(f"[Indexer] Uploading asset to Index {index.id}...")
    asset = tl_client.assets.create(
        video_url=presigned_url,
        index_id=index.id,
    )
    
    # 4. Trigger Indexing
    indexed_asset = tl_client.indexes.indexed_assets.create(
        index_id=index.id,
        asset_id=asset.id
    )

    return index.id, indexed_asset.id

def check_status(index_id: str, asset_id: str):
    """Checks the status of a specific asset."""
    return tl_client.indexes.indexed_assets.retrieve(
        index_id=index_id,
        indexed_asset_id=asset_id
    )

def background_index_processor(video_filename: str, video_db_id: str):
    """
    1. Updates DB status to 'processing'
    2. Sends to Twelve Labs
    3. Polls for completion
    4. Updates DB with IDs and status 'ready'
    """
    try:
        supabase.table("videos").update({"status": "processing"}).eq("id", video_db_id).execute()

        index_id, asset_id = create_index_and_task(video_filename)
        print(f"[Background] Started Indexing. Index: {index_id}, Asset: {asset_id}")

        # Poll for completion
        while True:
            status_obj = check_status(index_id, asset_id)
            print(f"[Background] Asset {asset_id} Status: {status_obj.status}")
            
            if status_obj.status == "ready":
                print(f"[Background] SUCCESS: Video ready for queries. Video ID: {status_obj.id}")
                
                supabase.table("videos").update({
                    "status": "ready",
                    "twelvelabs_index_id": index_id,
                    "twelvelabs_video_id": asset_id, # The specific asset ID
                }).eq("id", video_db_id).execute()
                print(f"[Indexer] Video {video_db_id} is READY.")
                break
            
            elif status_obj.status == "failed":
                print("[Background] FAILURE: Indexing failed.")
                supabase.table("videos").update({"status": "failed"}).eq("id", video_db_id).execute()
                print(f"[Indexer] Video {video_db_id} FAILED.")
                break
                
            time.sleep(5)

    except Exception as e:
        print(f"[Background] Error: {e}")
        supabase.table("videos").update({"status": "failed"}).eq("id", video_db_id).execute()