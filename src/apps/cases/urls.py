from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CrimeLevelViewSet, CaseViewSet, ComplainantViewSet, 
    WitnessViewSet, CaseReviewViewSet
)

router = DefaultRouter()
router.register(r'crime-levels', CrimeLevelViewSet, basename='crime-level')
router.register(r'cases', CaseViewSet, basename='case')
router.register(r'complainants', ComplainantViewSet, basename='complainant')
router.register(r'witnesses', WitnessViewSet, basename='witness')
router.register(r'reviews', CaseReviewViewSet, basename='case-review')

urlpatterns = [
    path('', include(router.urls)),
]
