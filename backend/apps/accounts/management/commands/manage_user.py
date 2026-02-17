"""
Django management command to manage user roles and approvals.
Usage:
    python manage.py manage_user <action> [options]
    
Actions:
    list              - List all users with their roles
    list-pending      - List inactive users awaiting approval
    approve           - Activate a user account
    assign-role       - Assign a role to a user
    remove-role       - Remove a role from a user
    list-roles        - List all available roles
"""
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from apps.accounts.models import Role
from django.db.models import Q
from tabulate import tabulate

User = get_user_model()


class Command(BaseCommand):
    help = 'Manage user roles and approvals from command line'

    def add_arguments(self, parser):
        parser.add_argument(
            'action',
            type=str,
            choices=['list', 'list-pending', 'approve', 'assign-role', 'remove-role', 'list-roles', 'create-role'],
            help='Action to perform'
        )
        parser.add_argument(
            '--username',
            type=str,
            help='Username of the user'
        )
        parser.add_argument(
            '--role',
            type=str,
            help='Role name to assign or remove'
        )
        parser.add_argument(
            '--name',
            type=str,
            help='Role name (for create-role)'
        )
        parser.add_argument(
            '--description',
            type=str,
            help='Role description (for create-role)'
        )
        parser.add_argument(
            '--police-rank',
            action='store_true',
            help='Mark role as police rank (for create-role)'
        )
        parser.add_argument(
            '--hierarchy',
            type=int,
            default=0,
            help='Hierarchy level for role (for create-role)'
        )

    def handle(self, *args, **options):
        action = options['action']
        
        if action == 'list':
            self.list_users()
        elif action == 'list-pending':
            self.list_pending_users()
        elif action == 'approve':
            self.approve_user(options['username'])
        elif action == 'assign-role':
            self.assign_role(options['username'], options['role'])
        elif action == 'remove-role':
            self.remove_role(options['username'], options['role'])
        elif action == 'list-roles':
            self.list_roles()
        elif action == 'create-role':
            self.create_role(
                options['name'],
                options.get('description', ''),
                options.get('police_rank', False),
                options.get('hierarchy', 0)
            )

    def list_users(self):
        """List all users with their roles."""
        users = User.objects.all().prefetch_related('roles')
        
        if not users:
            self.stdout.write(self.style.WARNING('No users found.'))
            return
        
        data = []
        for user in users:
            roles = ', '.join([role.name for role in user.roles.all()]) or 'No roles'
            status = '✓ Active' if user.is_active else '✗ Inactive'
            is_staff = '👤 Staff' if user.is_staff else ''
            
            data.append([
                user.id,
                user.username,
                user.email,
                user.get_full_name(),
                roles,
                status,
                is_staff
            ])
        
        headers = ['ID', 'Username', 'Email', 'Full Name', 'Roles', 'Status', 'Staff']
        table = tabulate(data, headers=headers, tablefmt='grid')
        
        self.stdout.write('\n' + self.style.SUCCESS('═' * 120))
        self.stdout.write(self.style.SUCCESS('ALL USERS'))
        self.stdout.write(self.style.SUCCESS('═' * 120))
        self.stdout.write(table)
        self.stdout.write(self.style.SUCCESS('═' * 120 + '\n'))

    def list_pending_users(self):
        """List inactive users awaiting approval."""
        users = User.objects.filter(is_active=False).prefetch_related('roles')
        
        if not users:
            self.stdout.write(self.style.SUCCESS('✓ No pending users. All users are approved.'))
            return
        
        data = []
        for user in users:
            roles = ', '.join([role.name for role in user.roles.all()]) or 'No roles'
            data.append([
                user.id,
                user.username,
                user.email,
                user.phone_number,
                user.national_id,
                user.get_full_name(),
                roles,
                user.date_joined.strftime('%Y-%m-%d %H:%M')
            ])
        
        headers = ['ID', 'Username', 'Email', 'Phone', 'National ID', 'Full Name', 'Roles', 'Registered']
        table = tabulate(data, headers=headers, tablefmt='grid')
        
        self.stdout.write('\n' + self.style.WARNING('═' * 150))
        self.stdout.write(self.style.WARNING(f'PENDING USERS ({len(users)})'))
        self.stdout.write(self.style.WARNING('═' * 150))
        self.stdout.write(table)
        self.stdout.write(self.style.WARNING('═' * 150 + '\n'))
        self.stdout.write(self.style.NOTICE(f'\nTo approve a user, run: python manage.py manage_user approve --username <username>'))

    def approve_user(self, username):
        """Activate a user account."""
        if not username:
            raise CommandError('Username is required. Use --username <username>')
        
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise CommandError(f'User "{username}" not found.')
        
        if user.is_active:
            self.stdout.write(self.style.WARNING(f'User "{username}" is already active.'))
            return
        
        user.is_active = True
        user.save()
        
        self.stdout.write(self.style.SUCCESS(f'✓ User "{username}" has been approved and activated.'))
        self.stdout.write(self.style.NOTICE(f'  Email: {user.email}'))
        self.stdout.write(self.style.NOTICE(f'  Full Name: {user.get_full_name()}'))

    def assign_role(self, username, role_name):
        """Assign a role to a user."""
        if not username:
            raise CommandError('Username is required. Use --username <username>')
        if not role_name:
            raise CommandError('Role name is required. Use --role <role_name>')
        
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise CommandError(f'User "{username}" not found.')
        
        try:
            role = Role.objects.get(name=role_name)
        except Role.DoesNotExist:
            raise CommandError(f'Role "{role_name}" not found. Use "list-roles" to see available roles.')
        
        if role in user.roles.all():
            self.stdout.write(self.style.WARNING(f'User "{username}" already has role "{role_name}".'))
            return
        
        user.roles.add(role)
        
        self.stdout.write(self.style.SUCCESS(f'✓ Role "{role_name}" assigned to user "{username}".'))
        current_roles = ', '.join([r.name for r in user.roles.all()])
        self.stdout.write(self.style.NOTICE(f'  Current roles: {current_roles}'))

    def remove_role(self, username, role_name):
        """Remove a role from a user."""
        if not username:
            raise CommandError('Username is required. Use --username <username>')
        if not role_name:
            raise CommandError('Role name is required. Use --role <role_name>')
        
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise CommandError(f'User "{username}" not found.')
        
        try:
            role = Role.objects.get(name=role_name)
        except Role.DoesNotExist:
            raise CommandError(f'Role "{role_name}" not found.')
        
        if role not in user.roles.all():
            self.stdout.write(self.style.WARNING(f'User "{username}" does not have role "{role_name}".'))
            return
        
        user.roles.remove(role)
        
        self.stdout.write(self.style.SUCCESS(f'✓ Role "{role_name}" removed from user "{username}".'))
        remaining_roles = ', '.join([r.name for r in user.roles.all()]) or 'No roles'
        self.stdout.write(self.style.NOTICE(f'  Remaining roles: {remaining_roles}'))

    def list_roles(self):
        """List all available roles."""
        roles = Role.objects.all()
        
        if not roles:
            self.stdout.write(self.style.WARNING('No roles found.'))
            return
        
        data = []
        for role in roles:
            user_count = role.users.count()
            rank_type = '🎖️  Police' if role.is_police_rank else '👤 Civilian'
            
            data.append([
                role.id,
                role.name,
                role.description[:50] + '...' if len(role.description) > 50 else role.description,
                rank_type,
                role.hierarchy_level,
                user_count
            ])
        
        headers = ['ID', 'Role Name', 'Description', 'Type', 'Hierarchy', 'Users']
        table = tabulate(data, headers=headers, tablefmt='grid')
        
        self.stdout.write('\n' + self.style.SUCCESS('═' * 120))
        self.stdout.write(self.style.SUCCESS('AVAILABLE ROLES'))
        self.stdout.write(self.style.SUCCESS('═' * 120))
        self.stdout.write(table)
        self.stdout.write(self.style.SUCCESS('═' * 120 + '\n'))

    def create_role(self, name, description, is_police_rank, hierarchy_level):
        """Create a new role."""
        if not name:
            raise CommandError('Role name is required. Use --name <role_name>')
        
        if Role.objects.filter(name=name).exists():
            raise CommandError(f'Role "{name}" already exists.')
        
        role = Role.objects.create(
            name=name,
            description=description,
            is_police_rank=is_police_rank,
            hierarchy_level=hierarchy_level
        )
        
        self.stdout.write(self.style.SUCCESS(f'✓ Role "{name}" created successfully.'))
        self.stdout.write(self.style.NOTICE(f'  Description: {description or "None"}'))
        self.stdout.write(self.style.NOTICE(f'  Police Rank: {is_police_rank}'))
        self.stdout.write(self.style.NOTICE(f'  Hierarchy Level: {hierarchy_level}'))
