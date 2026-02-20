from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    """
    Allow access if the user is a superuser, staff, or has the 'Administrator' role.
    Mirrors the frontend isAdmin() check in AdminPanel.tsx.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser or user.is_staff:
            return True
        return user.roles.filter(name='Administrator').exists()
