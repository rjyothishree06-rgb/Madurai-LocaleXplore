import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from django.conf import settings

_mongo_client = None
_db = None

def get_database():
    global _mongo_client, _db
    
    if _db is not None:
        return _db
        
    mongo_uri = getattr(settings, 'MONGO_URI', None)
    if not mongo_uri:
        mongo_uri = os.environ.get('MONGO_URI')
        
    if not mongo_uri:
        raise ValueError("MONGO_URI is not configured. Please set your MongoDB Atlas connection string.")
        
    _mongo_client = MongoClient(mongo_uri)
    
    # Short connection test using ping
    try:
        _mongo_client.admin.command('ping')
    except Exception as e:
        raise ConnectionFailure(f"Failed to connect to MongoDB Atlas: {e}")
    
    db_name = getattr(settings, 'MONGO_DB_NAME', 'maduraitrips')
    _db = _mongo_client[db_name]
    
    return _db
