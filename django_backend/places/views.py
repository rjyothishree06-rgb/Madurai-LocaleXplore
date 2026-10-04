import json
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Avg


import os
from django.conf import settings

DATA_DIR = os.path.join(settings.BASE_DIR.parent, 'server', 'data')

def place_list_api(request):
    """
    GET /api/places/
    Returns a list of all tourist places from places.json.
    """
    file_path = os.path.join(DATA_DIR, 'places.json')
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            places_data = json.load(f)
        return JsonResponse({
            'success': True,
            'places': places_data
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

def food_list_api(request):
    """
    GET /api/foods/
    Returns food data from foods.json
    """
    file_path = os.path.join(DATA_DIR, 'foods.json')
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            foods_data = json.load(f)
        return JsonResponse({
            'success': True,
            'foods': foods_data
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

def itinerary_list_api(request):
    """
    GET /api/itineraries/
    Returns itineraries data from itineraries.json
    """
    file_path = os.path.join(DATA_DIR, 'itineraries.json')
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            itineraries_data = json.load(f)
        return JsonResponse({
            'success': True,
            'itineraries': itineraries_data
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

def place_detail_api(request, id):
    """
    GET /api/places/<id>/
    Returns details for a single place from places.json.
    """
    file_path = os.path.join(DATA_DIR, 'places.json')
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            places = json.load(f)
        for p in places:
            if p.get('id') == id:
                return JsonResponse({'success': True, 'place': p})
        return JsonResponse({'success': False, 'message': f'Place with ID "{id}" not found.'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)
