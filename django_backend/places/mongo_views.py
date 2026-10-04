import json
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from bson import ObjectId
from .mongo_client import get_database
from django.contrib.auth.hashers import make_password, check_password

def _serialize_mongo_doc(doc):
    """Helper to convert ObjectId to string for JSON serialization recursively."""
    if isinstance(doc, dict):
        new_doc = {}
        for k, v in doc.items():
            if isinstance(v, ObjectId):
                new_doc[k] = str(v)
            else:
                new_doc[k] = _serialize_mongo_doc(v)
        if '_id' in new_doc:
            new_doc['id'] = str(new_doc['_id'])
        return new_doc
    elif isinstance(doc, list):
        return [_serialize_mongo_doc(item) for item in doc]
    elif isinstance(doc, ObjectId):
        return str(doc)
    else:
        return doc

@csrf_exempt
def save_trip_api(request):
    """POST /api/mongo/trips/ - Save a custom trip."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Only POST method is allowed.'}, status=405)
        
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)
        
    user_id = data.get('user_id') or 'guest'
    username = data.get('username') or 'Guest'
    trip_name = data.get('trip_name', 'My Custom Trip')
    date = data.get('date', datetime.now().strftime('%d %b %Y'))
    locations = data.get('locations', [])
    
    trip_doc = {
        'user_id': user_id,
        'username': username,
        'trip_name': trip_name,
        'date': date,
        'locations': locations,
        'created_at': datetime.now()
    }
    
    db = get_database()
    result = db.custom_trips.insert_one(trip_doc)
    trip_doc['_id'] = str(result.inserted_id)
    
    return JsonResponse({
        'success': True,
        'message': 'Trip saved successfully',
        'trip': _serialize_mongo_doc(trip_doc)
    }, status=201)

def get_trips_api(request, user_id):
    """GET /api/mongo/trips/<user_id>/ - Get custom trips for user."""
    db = get_database()
    trips = list(db.custom_trips.find({'user_id': user_id}).sort('created_at', -1))
    
    # Serialize ObjectId for JSON response
    serialized_trips = [_serialize_mongo_doc(trip) for trip in trips]
    
    return JsonResponse({
        'success': True,
        'user_id': user_id,
        'trips': serialized_trips
    })

@csrf_exempt
def save_completed_trip_api(request):
    """POST /api/mongo/completed-trips/ - Save a completed trip."""
    print("--- save_completed_trip_api TRIGGERED ---")
    if request.method != 'POST':
        print("ERROR: Not POST")
        return JsonResponse({'success': False, 'message': 'Only POST method is allowed.'}, status=405)
        
    try:
        data = json.loads(request.body.decode('utf-8'))
        print("Payload received:", data)
    except Exception as e:
        print("ERROR: Invalid JSON", str(e))
        return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)
        
    user_id = data.get('user_id')
    username = data.get('username')
    
    if not user_id:
        print("ERROR: user_id is missing")
        return JsonResponse({'success': False, 'message': 'user_id is required'}, status=400)
        
    trip_name = data.get('trip_name', 'Completed Trip')
    places = data.get('places', [])
    completed_date = data.get('completed_date', datetime.now().strftime('%d %b %Y'))
    
    trip_doc = {
        'user_id': user_id,
        'username': username or user_id,
        'trip_name': trip_name,
        'places': places,
        'completed_date': completed_date,
        'created_at': datetime.now()
    }
    
    try:
        db = get_database()
        print("Connected to DB:", db.name)
        
        # Prevent duplicates: Check if a trip with same name and user exists
        existing_trip = db.completed_trips.find_one({'user_id': user_id, 'trip_name': trip_name})
        if existing_trip:
            print("Duplicate trip found")
            return JsonResponse({
                'success': True,
                'message': 'Trip already marked as completed',
                'trip': _serialize_mongo_doc(existing_trip)
            }, status=200)
            
        result = db.completed_trips.insert_one(trip_doc)
        print("INSERTED document with _id:", result.inserted_id)
        trip_doc['_id'] = str(result.inserted_id)
    except Exception as e:
        print("ERROR inserting into MongoDB:", str(e))
        return JsonResponse({'success': False, 'message': str(e)}, status=500)
    
    return JsonResponse({
        'success': True,
        'message': 'Completed trip saved successfully',
        'trip': _serialize_mongo_doc(trip_doc)
    }, status=201)

def get_completed_trips_api(request, user_id):
    """GET /api/mongo/completed-trips/<user_id>/ - Get completed trips for user."""
    db = get_database()
    trips = list(db.completed_trips.find({'user_id': user_id}).sort('created_at', -1))
    
    serialized_trips = [_serialize_mongo_doc(trip) for trip in trips]
    
    return JsonResponse({
        'success': True,
        'user_id': user_id,
        'completed_trips': serialized_trips
    })

@csrf_exempt
def save_review_api(request):
    """POST /api/mongo/reviews/ - Save user reviews."""
    print("--- save_review_api TRIGGERED ---")
    if request.method != 'POST':
        print("ERROR: Not POST method")
        return JsonResponse({'success': False, 'message': 'Only POST method is allowed.'}, status=405)
        
    try:
        data = json.loads(request.body.decode('utf-8'))
        print("Payload received:", data)
    except Exception as e:
        print("ERROR: Invalid JSON", str(e))
        return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)
        
    reviews_data = data if isinstance(data, list) else [data]
    
    if not reviews_data:
        print("ERROR: No reviews provided")
        return JsonResponse({'success': False, 'message': 'No reviews provided'}, status=400)
        
    docs_to_insert = []
    
    for r in reviews_data:
        user_id = r.get('user_id')
        place_id = r.get('place_id')
        if not user_id or not place_id:
            continue
            
        review_doc = {
            'user_id': user_id,
            'username': r.get('username') or user_id,
            'place_id': place_id,
            'place_name': r.get('place_name', 'Unknown Place'),
            'rating': r.get('rating', 5),
            'review': r.get('review', ''),
            'date': r.get('date', datetime.now().strftime('%d %b %Y')),
            'created_at': datetime.now()
        }
        docs_to_insert.append(review_doc)
        
    if not docs_to_insert:
        print("ERROR: Invalid review data - docs_to_insert is empty")
        return JsonResponse({'success': False, 'message': 'Invalid review data'}, status=400)
        
    try:
        db = get_database()
        print("Connected to DB:", db.name)
        result = db.reviews.insert_many(docs_to_insert)
        print("INSERTED reviews with _ids:", result.inserted_ids)
        
        for doc in docs_to_insert:
            doc['_id'] = str(doc['_id'])
            
        return JsonResponse({
            'success': True,
            'message': f'{len(docs_to_insert)} reviews saved successfully',
            'reviews': [_serialize_mongo_doc(d) for d in docs_to_insert]
        }, status=201)
    except Exception as e:
        print("ERROR inserting reviews into MongoDB:", str(e))
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@csrf_exempt
def record_viewed_place_api(request):
    """POST /api/mongo/viewed/ - Record a viewed place."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Only POST method is allowed.'}, status=405)
        
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)
        
    user_id = data.get('user_id') or 'guest'
    place_id = data.get('place_id')
    place_name = data.get('place_name', place_id)
    
    if not place_id:
        return JsonResponse({'success': False, 'message': 'place_id is required'}, status=400)
        
    view_doc = {
        'user_id': user_id,
        'place_id': place_id,
        'place_name': place_name,
        'viewed_at': datetime.now()
    }
    
    db = get_database()
    
    # Optional: we could upsert or just insert. Let's just insert to keep history, 
    # but when getting, we'll only return unique latest places.
    # To keep it simpler and avoid DB growing infinitely, let's remove existing for this user/place,
    # then insert the new one, effectively moving it to the top.
    db.recently_viewed.delete_many({'user_id': user_id, 'place_id': place_id})
    result = db.recently_viewed.insert_one(view_doc)
    
    view_doc['_id'] = str(result.inserted_id)
    
    return JsonResponse({
        'success': True,
        'message': 'View recorded',
        'viewed': _serialize_mongo_doc(view_doc)
    }, status=201)

def get_viewed_places_api(request, user_id):
    """GET /api/mongo/viewed/<user_id>/ - Get recently viewed places."""
    db = get_database()
    # Get the latest 10 viewed places for the user
    views = list(db.recently_viewed.find({'user_id': user_id}).sort('viewed_at', -1).limit(10))
    
    serialized_views = [_serialize_mongo_doc(v) for v in views]
    
    return JsonResponse({
        'success': True,
        'user_id': user_id,
        'recently_viewed': serialized_views
    })

@csrf_exempt
def register_api(request):
    """POST /api/mongo/register/ - Register a new user."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Only POST method is allowed.'}, status=405)
        
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)
        
    username = data.get('username')
    name = data.get('name')
    phone = data.get('phone')
    email = data.get('email')
    password = data.get('password')
    address = data.get('address', '')
    
    if not all([username, name, phone, email, password]):
        return JsonResponse({'success': False, 'message': 'Username, name, phone, email, and password are required.'}, status=400)
        
    db = get_database()
    
    # Check if user already exists
    if db.users.find_one({'$or': [{'username': username}, {'email': email}, {'phone': phone}]}):
        return JsonResponse({'success': False, 'message': 'An account with this Username, Email or Phone already exists.'}, status=409)
        
    user_doc = {
        'username': username,
        'name': name,
        'phone': phone,
        'email': email,
        'password': make_password(password),
        'address': address,
        'created_at': datetime.now()
    }
    
    result = db.users.insert_one(user_doc)
    user_doc['_id'] = str(result.inserted_id)
    
    # Do not return password
    user_doc.pop('password', None)
    
    return JsonResponse({
        'success': True,
        'message': 'Registration successful',
        'user': _serialize_mongo_doc(user_doc)
    }, status=201)

@csrf_exempt
def login_api(request):
    """POST /api/mongo/login/ - Login user using email/phone and password."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Only POST method is allowed.'}, status=405)
        
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)
        
    identity = data.get('identity')
    password = data.get('password')
    
    if not identity or not password:
        return JsonResponse({'success': False, 'message': 'Identity and password are required.'}, status=400)
        
    db = get_database()
    
    # Find user by email, phone or username
    user = db.users.find_one({
        '$or': [{'username': identity}, {'email': identity}, {'phone': identity}]
    })
    
    if not user or not check_password(password, user.get('password') or ''):
        return JsonResponse({'success': False, 'message': 'Invalid credentials.'}, status=401)
        
    # Do not return password
    user.pop('password', None)
    
    return JsonResponse({
        'success': True,
        'message': 'Login successful',
        'user': _serialize_mongo_doc(user)
    })

@csrf_exempt
def user_detail_api(request, user_id):
    """GET/PUT /api/mongo/user/<user_id>/ - Get or Update user profile."""
    db = get_database()
    
    if request.method == 'GET':
        user = db.users.find_one({'_id': ObjectId(user_id)})
        if not user:
            return JsonResponse({'success': False, 'message': 'User not found.'}, status=404)
            
        user.pop('password', None)
        return JsonResponse({
            'success': True,
            'user': _serialize_mongo_doc(user)
        })
        
    elif request.method == 'PUT':
        try:
            data = json.loads(request.body.decode('utf-8'))
        except Exception:
            return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)
            
        name = data.get('name')
        phone = data.get('phone')
        email = data.get('email')
        address = data.get('address')
        
        # Check uniqueness of email/phone (excluding current user)
        existing = db.users.find_one({
            '$or': [{'email': email}, {'phone': phone}],
            '_id': {'$ne': ObjectId(user_id)}
        })
        if existing:
            return JsonResponse({'success': False, 'message': 'Email or Phone is already in use by another account.'}, status=409)
            
        update_fields = {}
        if name: update_fields['name'] = name
        if phone: update_fields['phone'] = phone
        if email: update_fields['email'] = email
        if address is not None: update_fields['address'] = address
        
        if not update_fields:
            return JsonResponse({'success': False, 'message': 'No fields to update.'}, status=400)
            
        result = db.users.update_one({'_id': ObjectId(user_id)}, {'$set': update_fields})
        
        if result.matched_count == 0:
            return JsonResponse({'success': False, 'message': 'User not found.'}, status=404)
            
        user = db.users.find_one({'_id': ObjectId(user_id)})
        user.pop('password', None)
        
        return JsonResponse({
            'success': True,
            'message': 'Profile updated successfully',
            'user': _serialize_mongo_doc(user)
        })
        
    else:
        return JsonResponse({'success': False, 'message': 'Only GET and PUT methods are allowed.'}, status=405)


@csrf_exempt
def handle_favorites_api(request, user_id=None, place_id=None):
    """GET/POST/DELETE /api/mongo/favorites/"""
    db = get_database()
    
    if request.method == 'GET' and user_id:
        favorites = list(db.favorites.find({'user_id': user_id}).sort('added_at', -1))
        return JsonResponse({
            'success': True,
            'favorites': [_serialize_mongo_doc(f) for f in favorites]
        })
        
    elif request.method == 'DELETE' and user_id and place_id:
        result = db.favorites.delete_one({'user_id': user_id, 'place_id': place_id})
        return JsonResponse({
            'success': True,
            'message': 'Favorite removed',
            'deleted_count': result.deleted_count
        })
        
    elif request.method == 'POST':
        try:
            data = json.loads(request.body.decode('utf-8'))
        except Exception:
            return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)
            
        uid = data.get('user_id')
        pid = data.get('place_id')
        if not uid or not pid:
            return JsonResponse({'success': False, 'message': 'user_id and place_id required'}, status=400)
            
        if db.favorites.find_one({'user_id': uid, 'place_id': pid}):
            return JsonResponse({'success': False, 'message': 'Already in favorites'}, status=400)
            
        fav_doc = {
            'user_id': uid,
            'username': data.get('username') or uid,
            'place_id': pid,
            'place_name': data.get('place_name', 'Unknown Place'),
            'added_at': datetime.now()
        }
        
        result = db.favorites.insert_one(fav_doc)
        fav_doc['_id'] = str(result.inserted_id)
        
        return JsonResponse({
            'success': True,
            'message': 'Added to favorites',
            'favorite': _serialize_mongo_doc(fav_doc)
        }, status=201)
        
    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


def get_user_reviews_api(request, user_id):
    """GET /api/mongo/reviews/user/<user_id>/"""
    db = get_database()
    reviews = list(db.reviews.find({'user_id': user_id}).sort('created_at', -1))
    return JsonResponse({
        'success': True,
        'user_id': user_id,
        'count': len(reviews),
        'reviews': [_serialize_mongo_doc(r) for r in reviews]
    })


def get_place_reviews_api(request, place_id):
    """GET /api/mongo/reviews/place/<place_id>/"""
    db = get_database()
    reviews = list(db.reviews.find({'place_id': place_id}).sort('created_at', -1))
    
    count = len(reviews)
    avg_rating = 0.0
    if count > 0:
        total = sum(float(r.get('rating', 0)) for r in reviews)
        avg_rating = round(total / count, 1)
        
    return JsonResponse({
        'success': True,
        'place_id': place_id,
        'count': count,
        'average_rating': avg_rating,
        'reviews': [_serialize_mongo_doc(r) for r in reviews]
    })


def get_user_statistics_api(request, user_id):
    """GET /api/mongo/statistics/<user_id>/"""
    db = get_database()
    
    custom_trips_count = db.custom_trips.count_documents({'user_id': user_id})
    
    completed_trips = list(db.completed_trips.find({'user_id': user_id}))
    completed_trips_count = len(completed_trips)
    
    places_visited_names_set = set()
    for trip in completed_trips:
        for place in trip.get('places', []):
            if isinstance(place, dict):
                name = place.get('title') or place.get('name')
                if name:
                    places_visited_names_set.add(name)
            elif isinstance(place, str):
                places_visited_names_set.add(place)
                
    places_visited = len(places_visited_names_set)
    places_visited_list = list(places_visited_names_set)
    
    user_reviews = list(db.reviews.find({'user_id': user_id}))
    review_count = len(user_reviews)
    
    avg_rating = 0
    if review_count > 0:
        total_rating = sum(float(r.get('rating', 0)) for r in user_reviews)
        avg_rating = round(total_rating / review_count, 1)
        
    return JsonResponse({
        'success': True,
        'statistics': {
            'total_trips': completed_trips_count,
            'reviews_given': review_count,
            'places_visited': places_visited,
            'places_visited_list': places_visited_list,
            'average_rating': avg_rating
        }
    })

