from django.urls import path
from . import views

urlpatterns = [
    path('', views.place_list_api, name='place_list_api'),
    path('<str:id>/', views.place_detail_api, name='place_detail_api'),
]