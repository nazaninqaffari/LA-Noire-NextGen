"""
Factory Boy factories for generating test data.
"""
import factory
from factory.django import DjangoModelFactory
from faker import Faker
from apps.accounts.models import User, Role

fake = Faker()


class RoleFactory(DjangoModelFactory):
    """Factory for Role model."""
    
    class Meta:
        model = Role
        django_get_or_create = ('name',)
    
    name = factory.Sequence(lambda n: f'Role{n}')
    description = factory.Faker('text', max_nb_chars=200)
    is_police_rank = factory.Faker('boolean', chance_of_getting_true=70)
    hierarchy_level = factory.Faker('random_int', min=0, max=10)


class UserFactory(DjangoModelFactory):
    """Factory for User model."""
    
    class Meta:
        model = User
    
    username = factory.Sequence(lambda n: f'user{n}')
    email = factory.LazyAttribute(lambda obj: f'{obj.username}@example.com')
    phone_number = factory.Sequence(lambda n: f'+1{n:010d}')
    national_id = factory.Sequence(lambda n: f'{n:010d}')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    is_active = True
    
    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        """Set password after creation."""
        if not create:
            return
        
        if extracted:
            self.set_password(extracted)
        else:
            self.set_password('testpass123')
        self.save()
    
    @factory.post_generation
    def roles(self, create, extracted, **kwargs):
        """Add roles after creation."""
        if not create:
            return
        
        if extracted:
            for role in extracted:
                self.roles.add(role)
