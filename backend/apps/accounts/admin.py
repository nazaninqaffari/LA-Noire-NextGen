from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Role


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    """Admin interface for Role management."""
    list_display = ['name', 'is_police_rank', 'hierarchy_level', 'created_at']
    list_filter = ['is_police_rank']
    search_fields = ['name', 'description']
    ordering = ['-hierarchy_level', 'name']


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin interface for User management."""
    list_display = ['username', 'email', 'get_full_name', 'is_active', 'is_staff', 'date_joined']
    list_filter = ['is_active', 'is_staff', 'roles']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'national_id', 'phone_number']
    ordering = ['-date_joined']
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email', 'phone_number', 'national_id')}),
        ('Roles', {'fields': ('roles',)}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'phone_number', 'national_id', 
                      'first_name', 'last_name', 'password1', 'password2'),
        }),
    )
    
    filter_horizontal = ('roles', 'groups', 'user_permissions')
