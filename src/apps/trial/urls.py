from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TrialViewSet, VerdictViewSet, PunishmentViewSet, BailPaymentViewSet

router = DefaultRouter()
router.register(r'trials', TrialViewSet, basename='trial')
router.register(r'verdicts', VerdictViewSet, basename='verdict')
router.register(r'punishments', PunishmentViewSet, basename='punishment')
router.register(r'bail-payments', BailPaymentViewSet, basename='bail-payment')

urlpatterns = [
    path('', include(router.urls)),
]
