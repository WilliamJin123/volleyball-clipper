# backend/services/indexer.py
import time
from twelvelabs import Asset, IndexesCreateRequestModelsItem
from .common import tl_client, get_public_url, supabase, setup_logger

logger = setup_logger("Indexer")

def create_index_and_task(video_filename: str, index_name: str = None):
    """
    1. Gets R2 public URL
    2. Creates a Twelve Labs Index
    3. Starts the indexing task
    Returns: The new Index ID and the Asset ID (Task)
    """
    if not index_name:
        timestamp = int(time.time())
        index_name = f"volleyball_{video_filename}_{timestamp}"

    # 1. Get public URL for Twelve Labs to download
    public_url = get_public_url(video_filename)

    logger.info(f"Creating index '{index_name}'...")
    # 2. Create Index
    index = tl_client.indexes.create(
        index_name=index_name,
        models=[
            IndexesCreateRequestModelsItem(
                model_name="marengo3.0", model_options=["visual", "audio"]
            ),
            IndexesCreateRequestModelsItem(
                model_name="pegasus1.2", model_options=["visual", "audio"]
            ),
        ],
        addons=["thumbnail"] 
    )

    # 3. Create Asset (Link video to index)
    logger.info(f"Uploading asset to Index {index.id}... [{public_url}]")
    asset = tl_client.assets.create(
        method="url",
        url=public_url,
        filename=video_filename
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
    start_time = time.time()
    try:
        supabase.table("videos").update({"status": "processing"}).eq("id", video_db_id).execute()

        index_id, asset_id = create_index_and_task(video_filename)
        logger.info(f"Started Indexing. Index: {index_id}, Asset: {asset_id}")

        # Poll for completion
        poll_count = 0
        while True:
            poll_count += 1
            elapsed = time.time() - start_time
            status_obj = check_status(index_id, asset_id)
            logger.info(f"Poll #{poll_count} | Elapsed: {elapsed:.1f}s | Asset {asset_id} Status: {status_obj.status}")

            if status_obj.status == "ready":
                total_time = time.time() - start_time
                logger.info(f"SUCCESS: Video ready for queries. Video ID: {status_obj.id} (took {total_time:.1f}s)")

                supabase.table("videos").update({
                    "status": "ready",
                    "twelvelabs_index_id": index_id,
                    "twelvelabs_video_id": asset_id, # The specific asset ID
                }).eq("id", video_db_id).execute()
                logger.info(f"Video {video_db_id} is READY.")
                break

            elif status_obj.status == "failed":
                logger.error("FAILURE: Indexing failed.")
                supabase.table("videos").update({"status": "failed"}).eq("id", video_db_id).execute()
                logger.error(f"Video {video_db_id} FAILED.")
                break

            time.sleep(5)

    except Exception as e:
        logger.exception(f"Error during indexing: {e}")
        supabase.table("videos").update({"status": "failed"}).eq("id", video_db_id).execute()