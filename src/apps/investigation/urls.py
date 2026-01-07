from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DetectiveBoardViewSet, BoardItemViewSet, EvidenceConnectionViewSet,
    SuspectViewSet, InterrogationViewSet, TipOffViewSet,
    SuspectSubmissionViewSet, NotificationViewSet,
    CaptainDecisionViewSet, PoliceChiefDecisionViewSet
)

router = DefaultRouter()
router.register(r'detective-boards', DetectiveBoardViewSet, basename='detective-board')
router.register(r'board-items', BoardItemViewSet, basename='board-item')
router.register(r'evidence-connections', EvidenceConnectionViewSet, basename='evidence-connection')
router.register(r'suspects', SuspectViewSet, basename='suspect')
router.register(r'suspect-submissions', SuspectSubmissionViewSet, basename='suspect-submission')
router.register(r'interrogations', InterrogationViewSet, basename='interrogation')
router.register(r'captain-decisions', CaptainDecisionViewSet, basename='captain-decision')
router.register(r'chief-decisions', PoliceChiefDecisionViewSet, basename='chief-decision')
router.register(r'tipoffs', TipOffViewSet, basename='tipoff')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
]
