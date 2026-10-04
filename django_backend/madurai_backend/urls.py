from django.contrib import admin
from django.urls import path, include
from places import views, mongo_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/places/', include('places.urls')),
    path('places/', include('places.urls')),

    
    path('api/foods/', views.food_list_api, name='food_list_api'),
    path('api/itineraries/', views.itinerary_list_api, name='itinerary_list_api'),
    
    # MongoDB Routes
    path('api/mongo/trips/', mongo_views.save_trip_api, name='save_trip_api'),
    path('api/mongo/trips/<str:user_id>/', mongo_views.get_trips_api, name='get_trips_api'),
    path('api/mongo/completed-trips/', mongo_views.save_completed_trip_api, name='save_completed_trip_api'),
    path('api/mongo/completed-trips/<str:user_id>/', mongo_views.get_completed_trips_api, name='get_completed_trips_api'),
    path('api/mongo/reviews/', mongo_views.save_review_api, name='save_review_api'),
    path('api/mongo/reviews/user/<str:user_id>/', mongo_views.get_user_reviews_api, name='mongo_user_reviews_api'),
    path('api/mongo/reviews/place/<str:place_id>/', mongo_views.get_place_reviews_api, name='mongo_place_reviews_api'),
    path('api/mongo/viewed/', mongo_views.record_viewed_place_api, name='record_viewed_place_api'),
    path('api/mongo/viewed/<str:user_id>/', mongo_views.get_viewed_places_api, name='get_viewed_places_api'),
    path('api/mongo/register/', mongo_views.register_api, name='mongo_register_api'),
    path('api/mongo/login/', mongo_views.login_api, name='mongo_login_api'),
    path('api/mongo/user/<str:user_id>/', mongo_views.user_detail_api, name='mongo_user_detail_api'),
    
    # Favorites
    path('api/mongo/favorites/', mongo_views.handle_favorites_api, name='mongo_favorites_api'),
    path('api/mongo/favorites/<str:user_id>/', mongo_views.handle_favorites_api, name='mongo_favorites_get_api'),
    path('api/mongo/favorites/<str:user_id>/<str:place_id>/', mongo_views.handle_favorites_api, name='mongo_favorites_delete_api'),
    
    # Statistics
    path('api/mongo/statistics/<str:user_id>/', mongo_views.get_user_statistics_api, name='mongo_statistics_api'),
]