from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TestimonyViewSet, BiologicalEvidenceViewSet, EvidenceImageViewSet,
    VehicleEvidenceViewSet, IDDocumentViewSet, GenericEvidenceViewSet
)

router = DefaultRouter()
router.register(r'testimonies', TestimonyViewSet, basename='testimony')
router.register(r'biological', BiologicalEvidenceViewSet, basename='biological')
router.register(r'images', EvidenceImageViewSet, basename='evidence-image')
router.register(r'vehicles', VehicleEvidenceViewSet, basename='vehicle')
router.register(r'id-documents', IDDocumentViewSet, basename='id-document')
router.register(r'generic', GenericEvidenceViewSet, basename='generic')

urlpatterns = [
    path('', include(router.urls)),
]
