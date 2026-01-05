from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DetectiveBoardViewSet, BoardItemViewSet, EvidenceConnectionViewSet,
    SuspectViewSet, InterrogationViewSet, TipOffViewSet
)

router = DefaultRouter()
router.register(r'detective-boards', DetectiveBoardViewSet, basename='detective-board')
router.register(r'board-items', BoardItemViewSet, basename='board-item')
router.register(r'evidence-connections', EvidenceConnectionViewSet, basename='evidence-connection')
router.register(r'suspects', SuspectViewSet, basename='suspect')
router.register(r'interrogations', InterrogationViewSet, basename='interrogation')
router.register(r'tipoffs', TipOffViewSet, basename='tipoff')

urlpatterns = [
    path('', include(router.urls)),
]
