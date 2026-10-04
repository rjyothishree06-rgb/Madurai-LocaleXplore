import os
import sys
import django

# Set up Django environment
sys.path.append(r'c:\Users\rames\OneDrive\Desktop\WT_web\madurai-localexplore\django_backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'madurai_backend.settings')
django.setup()

from places.mongo_client import get_database

def migrate():
    db = get_database()
    # Find trips where user_id contains '@' (likely an email)
    # Alternatively, just iterate all trips and check
    trips = db.custom_trips.find({})
    
    migrated_count = 0
    for trip in trips:
        user_id = trip.get('user_id', '')
        
        # If user_id looks like an email or doesn't match username
        if '@' in user_id or 'username' not in trip or trip.get('username') != trip.get('user_id'):
            # Find the user by email (or phone, etc. that matches the old user_id)
            user = db.users.find_one({'$or': [{'email': user_id}, {'phone': user_id}, {'username': user_id}]})
            if user and 'username' in user:
                new_username = user['username']
                
                db.custom_trips.update_one(
                    {'_id': trip['_id']},
                    {'$set': {
                        'user_id': new_username,
                        'username': new_username
                    }}
                )
                migrated_count += 1
                print(f"Migrated trip {trip['_id']} for user {user_id} -> {new_username}")
            else:
                print(f"Could not find matching user for trip {trip['_id']} with user_id: {user_id}")
                
    print(f"Migration complete. Migrated {migrated_count} trips.")

if __name__ == '__main__':
    migrate()
