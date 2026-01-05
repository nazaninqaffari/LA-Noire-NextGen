# Contributing to LA Noire NextGen

Thank you for your interest in contributing to LA Noire NextGen! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Documentation](#documentation)
- [Submitting Changes](#submitting-changes)

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Report any inappropriate behavior

## Getting Started

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/your-username/LA-Noire-NextGen.git
   cd LA-Noire-NextGen
   ```

3. **Set up development environment**
   ```bash
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

5. **Initialize database**
   ```bash
   python scripts/recreate_db.py
   ```

6. **Verify setup**
   ```bash
   python scripts/verify_setup.py
   ```

## Development Workflow

### Creating a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/modifications

### Making Changes

1. **Make your changes** following the code style guidelines
2. **Write tests** for new functionality
3. **Update documentation** as needed
4. **Run tests** to ensure nothing breaks
5. **Commit your changes** with clear messages

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Build/config changes

**Example:**
```
feat(cases): Add case archival functionality

Implement ability for captains to archive closed cases.
Archived cases are excluded from default queries but
can be retrieved with special filter.

Closes #123
```

## Code Style

### Python Code

Follow PEP 8 and Django best practices:

```python
# Good
class CaseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing cases.
    
    Provides CRUD operations and custom actions for case workflow.
    """
    queryset = Case.objects.select_related('crime_level', 'assigned_detective')
    serializer_class = CaseSerializer
    
    def get_queryset(self):
        """Filter queryset based on user permissions."""
        queryset = super().get_queryset()
        # Filter logic here
        return queryset
```

**Guidelines:**
- Use meaningful variable names
- Add docstrings to all classes and methods
- Keep functions focused and small
- Use type hints where beneficial
- Comment complex logic
- Follow Django naming conventions

### Model Design

```python
class Evidence(models.Model):
    """Base class for all evidence types."""
    
    # Use explicit field names
    case = models.ForeignKey('cases.Case', on_delete=models.CASCADE, related_name='evidence')
    recorded_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='recorded_evidence')
    recorded_at = models.DateTimeField(auto_now_add=True)
    
    # Add helpful methods
    def __str__(self):
        return f"{self.title} - Case {self.case.case_number}"
    
    # Add ordering
    class Meta:
        ordering = ['-recorded_at']
        verbose_name_plural = "Evidence"
```

### Serializer Best Practices

```python
class CaseSerializer(serializers.ModelSerializer):
    """Serializer for Case with nested relationships."""
    
    # Use explicit field definitions for clarity
    crime_level_details = CrimeLevelSerializer(source='crime_level', read_only=True)
    assigned_detective_name = serializers.CharField(
        source='assigned_detective.get_full_name',
        read_only=True
    )
    
    class Meta:
        model = Case
        fields = '__all__'  # Or list fields explicitly
        read_only_fields = ['case_number', 'created_at']
```

### API Documentation

Use drf-spectacular decorators for API documentation:

```python
from drf_spectacular.utils import extend_schema, OpenApiExample

class MyViewSet(viewsets.ModelViewSet):
    @extend_schema(
        summary="Short description",
        description="Detailed description of what this endpoint does",
        request=RequestSerializer,
        responses={200: ResponseSerializer},
        examples=[
            OpenApiExample(
                'Example Name',
                value={'field': 'value'},
                request_only=True
            )
        ]
    )
    @action(detail=True, methods=['post'])
    def custom_action(self, request, pk=None):
        # Implementation
        pass
```

## Testing

### Writing Tests

Create tests in `tests.py` within each app:

```python
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status

class CaseAPITestCase(APITestCase):
    """Test suite for Case API endpoints."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_create_case(self):
        """Test case creation."""
        data = {
            'title': 'Test Case',
            'description': 'Test description',
            'crime_level': 2
        }
        response = self.client.post('/api/v1/cases/cases/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
```

### Running Tests

```bash
# Run all tests
cd src
python manage.py test

# Run specific app tests
python manage.py test apps.cases

# Run with coverage
pip install coverage
coverage run --source='.' manage.py test
coverage report
```

## Documentation

### Code Comments

```python
def calculate_danger_score(self):
    """
    Calculate suspect danger score based on time at large.
    
    Formula: days_since_identification × crime_level
    
    Returns:
        int: Danger score ranging from 0 to unlimited
    
    Example:
        Suspect identified 10 days ago for level 1 crime
        returns danger_score of 10
    """
    # Implementation
```

### Markdown Documentation

Update documentation in `doc/` directory:
- Use Obsidian-compatible wiki links: `[[Other Document]]`
- Include code examples with proper syntax highlighting
- Add API endpoint examples with request/response
- Keep documentation in sync with code changes

## Submitting Changes

### Pull Request Process

1. **Update documentation**
   - Update relevant markdown files in `doc/`
   - Update README.md if needed
   - Add docstrings to new code

2. **Test your changes**
   ```bash
   python manage.py test
   python scripts/verify_setup.py
   ```

3. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill in PR template

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How has this been tested?

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] No new warnings generated
```

## Code Review Process

### For Authors
- Respond to feedback promptly
- Make requested changes in new commits
- Ask questions if feedback is unclear
- Be open to suggestions

### For Reviewers
- Be constructive and specific
- Explain the "why" behind suggestions
- Appreciate good code
- Test the changes if possible

## Project Structure Conventions

```
apps/
  <app_name>/
    __init__.py
    admin.py          # Django admin configuration
    apps.py           # App configuration
    models.py         # Database models
    serializers.py    # DRF serializers
    views.py          # API views/viewsets
    urls.py           # URL routing
    tests.py          # Test cases
    migrations/       # Database migrations
```

## Common Patterns

### Adding a New Model

1. Define model in `models.py`
2. Create serializer in `serializers.py`
3. Create viewset in `views.py`
4. Register URLs in `urls.py`
5. Register in admin in `admin.py`
6. Write tests in `tests.py`
7. Document in `doc/` directory
8. Run migrations

### Adding a Custom Action

```python
@extend_schema(...)  # Add API documentation
@action(detail=True, methods=['post'])
def custom_action(self, request, pk=None):
    """Custom action description."""
    obj = self.get_object()
    
    # Validate permissions
    if not request.user.has_role('Detective'):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Perform action
    # ...
    
    serializer = self.get_serializer(obj)
    return Response(serializer.data)
```

## Getting Help

- **Documentation**: Check `doc/` directory
- **Issues**: Search existing issues or create new one
- **Discussions**: Use GitHub Discussions for questions
- **Code Review**: Ask for clarification in PR comments

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

Thank you for contributing! 🎉
