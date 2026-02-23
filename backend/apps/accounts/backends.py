"""
Custom authentication backend supporting login via username, email,
phone_number, or national_id.
"""
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()


class MultiFieldAuthBackend:
    """
    Authenticate against username, email, phone_number, or national_id.

    The caller passes the identifier in the ``username`` kwarg (this is
    Django's convention).  We try to find a unique User that matches any
    of the four lookup fields and then check the password.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None

        try:
            user = User.objects.get(
                Q(username=username)
                | Q(email=username)
                | Q(phone_number=username)
                | Q(national_id=username)
            )
        except User.DoesNotExist:
            # Run the default password hasher to mitigate timing attacks
            User().set_password(password)
            return None
        except User.MultipleObjectsReturned:
            # Shouldn't happen with unique constraints, but be safe
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None

    def user_can_authenticate(self, user):
        """Reject users with is_active=False."""
        is_active = getattr(user, "is_active", None)
        return is_active or is_active is None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
