# Suspect Status & Intensive Pursuit System

## Overview

The Suspect Status System automatically tracks suspects over time and creates a public "wanted list" for those who have been at large for extended periods. This system implements:

1. **Automatic Status Transitions**: Suspects automatically move from "under pursuit" to "intensive pursuit" after 30 days
2. **Danger Score Calculation**: Formula-based ranking considering time at large and crime severity
3. **Reward System**: Automatic calculation of reward amounts based on danger level
4. **Public Wanted List**: Publicly accessible endpoint showing the most dangerous suspects

## System Architecture

### Status Lifecycle

```
Suspect Identified → Under Pursuit → Intensive Pursuit (after 30 days) → Arrested/Cleared
```

### Danger Score Formula

```
Danger Score = Days at Large × (4 - Crime Level)

Where Crime Level:
- Level 0 (Critical) = Score Weight 4
- Level 1 (Major)    = Score Weight 3
- Level 2 (Medium)   = Score Weight 2
- Level 3 (Minor)    = Score Weight 1
```

### Reward Calculation

```
Reward Amount = Danger Score × 20,000,000 Rials
```

## API Reference

### Public Endpoints

#### Get Intensive Pursuit List (Public Wanted List)

**Persian**: لیست عمومی مظنونین تحت تعقیب شدید

**Endpoint**: `GET /api/v1/investigation/suspects/intensive_pursuit/`

**Authentication**: None (Public Access)

**Description**: Returns list of suspects who have been at large for more than 30 days, ordered by danger score (most dangerous first). This endpoint automatically updates suspect statuses from "under_pursuit" to "intensive_pursuit" when appropriate.

**Query Parameters**: None

**Response**: `200 OK`

```json
[
  {
    "id": 123,
    "person_full_name": "علی رضایی",
    "person_username": "ali_rezaei",
    "photo": "/media/photos/suspect_123.jpg",
    "case_number": "CR-2024-001",
    "case_title": "پرونده سرقت مسلحانه",
    "crime_level": 0,
    "crime_level_name": "بحرانی",
    "reason": "مظنون اصلی در سرقت مسلحانه بانک",
    "days_at_large": 45,
    "danger_score": 180,
    "reward_amount": 3600000000,
    "identified_at": "2024-01-01T10:00:00Z",
    "status": "intensive_pursuit"
  },
  {
    "id": 124,
    "person_full_name": "محمد احمدی",
    "person_username": "mohammad_ahmadi",
    "photo": null,
    "case_number": "CR-2024-002",
    "case_title": "پرونده اختلاس",
    "crime_level": 1,
    "crime_level_name": "عمده",
    "reason": "متهم اصلی اختلاس",
    "days_at_large": 50,
    "reward_amount": 3000000000,
    "danger_score": 150,
    "identified_at": "2023-12-25T15:30:00Z",
    "status": "intensive_pursuit"
  }
]
```

**Example Usage**:

```bash
# Get public wanted list
curl -X GET http://localhost:8000/api/v1/investigation/suspects/intensive_pursuit/
```

```javascript
// JavaScript fetch example
fetch('http://localhost:8000/api/v1/investigation/suspects/intensive_pursuit/')
  .then(response => response.json())
  .then(data => {
    console.log('Most dangerous suspects:', data);
    // Display wanted posters on public website
  });
```

**Response Fields**:

| Field | Type | Description (Persian) |
|-------|------|----------------------|
| `id` | integer | شناسه منحصر به فرد مظنون |
| `person_full_name` | string | نام و نام خانوادگی کامل |
| `person_username` | string | نام کاربری |
| `photo` | string/null | آدرس عکس (برای پوستر تحقیق) |
| `case_number` | string | شماره پرونده |
| `case_title` | string | عنوان پرونده |
| `crime_level` | integer | سطح جنایت (0-3) |
| `crime_level_name` | string | نام سطح جنایت |
| `reason` | string | دلیل مظنون بودن |
| `days_at_large` | integer | تعداد روزهای فرار |
| `danger_score` | integer | امتیاز خطرناکی |
| `reward_amount` | integer | مبلغ جایزه (ریال) |
| `identified_at` | datetime | تاریخ شناسایی |
| `status` | string | وضعیت فعلی |

**Notes**:
- No authentication required - fully public
- Only shows suspects with status "under_pursuit" or "intensive_pursuit"
- Automatically excludes arrested and cleared suspects
- Ordered by danger_score descending (most dangerous first)
- Automatically updates status to "intensive_pursuit" for suspects over 30 days
- Response includes calculated fields (days_at_large, danger_score, reward_amount)

## Business Logic

### Automatic Status Transitions

The system automatically transitions suspect statuses based on time elapsed:

1. **Initial Status**: When a suspect is first identified, status = `under_pursuit`
2. **Intensive Pursuit Threshold**: After 30+ days, status changes to `intensive_pursuit`
3. **Terminal States**: `arrested` or `cleared` (no further transitions)

**Implementation**: Status update occurs when the `intensive_pursuit()` endpoint is called, ensuring data consistency without requiring background tasks.

### Danger Score Calculation

The danger score quantifies how dangerous and high-priority a suspect is:

**Formula**: `days_at_large × (4 - crime_level)`

**Rationale**:
- **Time Factor**: Longer time at large = higher danger
- **Crime Severity**: More severe crimes get higher weight
- **Multiplicative**: Both factors compound the danger

**Examples**:

| Days at Large | Crime Level | Crime Severity | Score Calculation | Danger Score |
|---------------|-------------|----------------|-------------------|--------------|
| 45 | 0 | Critical | 45 × (4-0) = 45 × 4 | **180** |
| 50 | 1 | Major | 50 × (4-1) = 50 × 3 | **150** |
| 100 | 2 | Medium | 100 × (4-2) = 100 × 2 | **200** |
| 50 | 3 | Minor | 50 × (4-3) = 50 × 1 | **50** |

**Key Insight**: A suspect wanted for a medium crime for 100 days (score: 200) can be more dangerous than someone wanted for a critical crime for 45 days (score: 180).

### Reward Calculation

Rewards incentivize public assistance in locating dangerous suspects:

**Formula**: `danger_score × 20,000,000 Rials`

**Examples**:

| Danger Score | Reward Calculation | Reward Amount |
|--------------|-------------------|---------------|
| 180 | 180 × 20,000,000 | 3,600,000,000 Rials |
| 150 | 150 × 20,000,000 | 3,000,000,000 Rials |
| 200 | 200 × 20,000,000 | 4,000,000,000 Rials |
| 50 | 50 × 20,000,000 | 1,000,000,000 Rials |

**Currency Note**: Amounts are in Iranian Rials (IRR).

### Filtering Logic

The intensive pursuit endpoint applies multiple filters:

1. **Status Filter**: `status IN (under_pursuit, intensive_pursuit)`
2. **Time Filter**: `identified_at <= (current_time - 30 days)`
3. **Implicit Filter**: Active suspects only (not arrested/cleared)

**Database Query**:
```python
thirty_days_ago = timezone.now() - timedelta(days=30)
suspects = Suspect.objects.filter(
    status__in=[Suspect.STATUS_UNDER_PURSUIT, Suspect.STATUS_INTENSIVE_PURSUIT],
    identified_at__lte=thirty_days_ago
).select_related('person', 'case', 'case__crime_level').order_by('-danger_score')
```

## Data Models

### Suspect Model (Relevant Fields)

```python
class Suspect(models.Model):
    # Status choices
    STATUS_UNDER_PURSUIT = 'under_pursuit'
    STATUS_INTENSIVE_PURSUIT = 'intensive_pursuit'
    STATUS_ARRESTED = 'arrested'
    STATUS_CLEARED = 'cleared'
    
    STATUS_CHOICES = [
        (STATUS_UNDER_PURSUIT, 'تحت تعقیب'),
        (STATUS_INTENSIVE_PURSUIT, 'تعقیب شدید'),
        (STATUS_ARRESTED, 'دستگیر شده'),
        (STATUS_CLEARED, 'تبرئه شده'),
    ]
    
    # Core fields
    case = models.ForeignKey(Case, on_delete=models.CASCADE)
    person = models.ForeignKey(User, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_UNDER_PURSUIT)
    identified_at = models.DateTimeField(auto_now_add=True)
    photo = models.ImageField(upload_to='suspects/', blank=True, null=True)
    reason = models.TextField()
    
    # Methods
    def is_intensive_pursuit(self):
        """Check if suspect qualifies for intensive pursuit."""
        if self.status not in [self.STATUS_UNDER_PURSUIT, self.STATUS_INTENSIVE_PURSUIT]:
            return False
        days_at_large = (timezone.now() - self.identified_at).days
        return days_at_large > 30
    
    def get_danger_score(self):
        """Calculate danger score: days × (4 - crime_level)."""
        days_at_large = (timezone.now() - self.identified_at).days
        crime_level = self.case.crime_level.level
        return days_at_large * (4 - crime_level)
    
    def get_reward_amount(self):
        """Calculate reward: danger_score × 20,000,000."""
        return self.get_danger_score() * 20_000_000
```

### IntensivePursuitSuspectSerializer

```python
class IntensivePursuitSuspectSerializer(serializers.ModelSerializer):
    """Public serializer for intensive pursuit wanted list."""
    
    person_full_name = serializers.CharField(source='person.get_full_name', read_only=True)
    person_username = serializers.CharField(source='person.username', read_only=True)
    case_number = serializers.CharField(source='case.case_number', read_only=True)
    case_title = serializers.CharField(source='case.title', read_only=True)
    crime_level = serializers.IntegerField(source='case.crime_level.level', read_only=True)
    crime_level_name = serializers.CharField(source='case.crime_level.name', read_only=True)
    days_at_large = serializers.SerializerMethodField()
    danger_score = serializers.IntegerField(source='get_danger_score', read_only=True)
    reward_amount = serializers.IntegerField(source='get_reward_amount', read_only=True)
    
    class Meta:
        model = Suspect
        fields = [
            'id', 'person_full_name', 'person_username', 'photo',
            'case_number', 'case_title', 'crime_level', 'crime_level_name',
            'reason', 'days_at_large', 'danger_score', 'reward_amount',
            'identified_at', 'status'
        ]
    
    def get_days_at_large(self, obj):
        """Calculate days since suspect was identified."""
        return (timezone.now() - obj.identified_at).days
```

## Use Cases

### 1. Public Wanted List Website

**Scenario**: City creates public website showing most wanted criminals

**Implementation**:
```html
<!-- Public website HTML -->
<div id="wanted-list">
  <h1>لیست مظنونین تحت تعقیب شدید</h1>
  <div id="suspects-grid"></div>
</div>

<script>
fetch('/api/v1/investigation/suspects/intensive_pursuit/')
  .then(response => response.json())
  .then(suspects => {
    const grid = document.getElementById('suspects-grid');
    suspects.forEach(suspect => {
      const card = `
        <div class="wanted-card">
          <img src="${suspect.photo || '/default-photo.jpg'}" />
          <h2>${suspect.person_full_name}</h2>
          <p>پرونده: ${suspect.case_title}</p>
          <p>جنایت: ${suspect.crime_level_name}</p>
          <p>روزهای فرار: ${suspect.days_at_large}</p>
          <p class="reward">جایزه: ${suspect.reward_amount.toLocaleString()} ریال</p>
          <p>خطرناکی: ${suspect.danger_score}</p>
        </div>
      `;
      grid.innerHTML += card;
    });
  });
</script>
```

### 2. Police Department Dashboard

**Scenario**: Detective wants to see which suspects have highest priority

**Implementation**:
```python
# Get intensive pursuit suspects
response = client.get('/api/v1/investigation/suspects/intensive_pursuit/')
suspects = response.data

# Top 10 most dangerous
top_10 = suspects[:10]

for suspect in top_10:
    print(f"{suspect['person_full_name']} - Danger: {suspect['danger_score']}")
```

### 3. Automatic Notifications

**Scenario**: Send alerts when suspects reach intensive pursuit threshold

**Implementation**:
```python
# Check for new intensive pursuit suspects
response = client.get('/api/v1/investigation/suspects/intensive_pursuit/')
suspects = response.data

for suspect in suspects:
    if suspect['days_at_large'] == 31:  # Just crossed threshold
        send_alert(f"INTENSIVE PURSUIT: {suspect['person_full_name']} - Case: {suspect['case_title']}")
```

### 4. Reward Budget Planning

**Scenario**: Calculate total reward budget for all intensive pursuit suspects

**Implementation**:
```python
response = client.get('/api/v1/investigation/suspects/intensive_pursuit/')
suspects = response.data

total_rewards = sum(suspect['reward_amount'] for suspect in suspects)
print(f"Total reward budget: {total_rewards:,} Rials")
```

## Testing

The system includes 20 comprehensive tests covering:

### 1. Status Transition Tests (4 tests)
- New suspects start in "under_pursuit"
- Suspects under 30 days don't qualify for intensive pursuit
- Suspects over 30 days qualify for intensive pursuit
- Arrested suspects never intensive pursuit

### 2. Danger Score Calculation Tests (4 tests)
- Critical crime danger score (level 0 × 4)
- Major crime danger score (level 1 × 3)
- Medium crime danger score (level 2 × 2)
- Minor crime danger score (level 3 × 1)

### 3. Reward Calculation Tests (2 tests)
- Correct reward calculation (score × 20M)
- Reward increases proportionally with time

### 4. API Endpoint Tests (8 tests)
- Public access (no authentication required)
- Only shows suspects over 30 days
- Ordered by danger score descending
- Includes all required fields
- Excludes arrested suspects
- Excludes cleared suspects
- Auto-updates status to intensive pursuit
- Correct reward display

### 5. Complex Scenario Tests (2 tests)
- Multiple suspects with different criteria
- Same person in multiple cases

### Running Tests

```bash
# Run all suspect status tests
pytest tests/test_suspect_status.py -v

# Run specific test class
pytest tests/test_suspect_status.py::TestIntensivePursuitAPI -v

# Run specific test
pytest tests/test_suspect_status.py::TestDangerScoreCalculation::test_danger_score_critical_crime -v

# Run with coverage
pytest tests/test_suspect_status.py --cov=apps.investigation --cov-report=html
```

## Performance Considerations

### Database Optimization

The endpoint uses `select_related()` for optimal query performance:

```python
suspects = Suspect.objects.filter(
    status__in=[Suspect.STATUS_UNDER_PURSUIT, Suspect.STATUS_INTENSIVE_PURSUIT],
    identified_at__lte=thirty_days_ago
).select_related('person', 'case', 'case__crime_level')
```

**Without select_related**: N+1 queries (1 for suspects + N for persons + N for cases + N for crime levels)

**With select_related**: Single JOIN query

**Performance Impact**:
- 100 suspects without optimization: 301 queries
- 100 suspects with optimization: 1 query
- ~300x improvement

### Caching Strategy (Optional)

For high-traffic public websites, consider caching:

```python
from django.core.cache import cache

def get_intensive_pursuit_list():
    # Check cache first
    cached = cache.get('intensive_pursuit_list')
    if cached:
        return cached
    
    # Generate list
    suspects = Suspect.objects.filter(
        status__in=[Suspect.STATUS_UNDER_PURSUIT, Suspect.STATUS_INTENSIVE_PURSUIT],
        identified_at__lte=timezone.now() - timedelta(days=30)
    ).select_related('person', 'case', 'case__crime_level')
    
    serializer = IntensivePursuitSuspectSerializer(suspects, many=True)
    data = serializer.data
    
    # Cache for 1 hour
    cache.set('intensive_pursuit_list', data, 3600)
    return data
```

## Security Considerations

### Public Access
- **No Authentication Required**: Endpoint is fully public
- **Safe Data Exposure**: Serializer only exposes non-sensitive information
- **No Personal Details**: No addresses, phone numbers, or family information

### Data Privacy
The public serializer intentionally limits exposed fields:

**Included** (Safe):
- Name, username
- Photo (for identification)
- Case number and title
- Crime level
- Danger score and reward
- Status

**Excluded** (Private):
- Home address
- Phone numbers
- Family members
- Detailed evidence
- Police notes and strategies

### Rate Limiting (Recommended)

For production deployment, implement rate limiting:

```python
from rest_framework.throttling import AnonRateThrottle

class IntensivePursuitThrottle(AnonRateThrottle):
    rate = '100/hour'  # 100 requests per hour for anonymous users

class SuspectViewSet(viewsets.ModelViewSet):
    @action(detail=False, methods=['get'], 
            permission_classes=[],
            throttle_classes=[IntensivePursuitThrottle])
    def intensive_pursuit(self, request):
        # ... implementation
```

## Integration Examples

### Mobile App Integration

```swift
// Swift iOS example
func loadIntensivePursuitList() {
    let url = URL(string: "https://api.police.gov.ir/api/v1/investigation/suspects/intensive_pursuit/")!
    
    URLSession.shared.dataTask(with: url) { data, response, error in
        guard let data = data else { return }
        
        let suspects = try? JSONDecoder().decode([Suspect].self, from: data)
        DispatchQueue.main.async {
            self.displayWantedList(suspects)
        }
    }.resume()
}
```

### Android App Integration

```kotlin
// Kotlin Android example
fun loadIntensivePursuitList() {
    val url = "https://api.police.gov.ir/api/v1/investigation/suspects/intensive_pursuit/"
    
    val request = Request.Builder().url(url).build()
    
    client.newCall(request).enqueue(object : Callback {
        override fun onResponse(call: Call, response: Response) {
            val suspects = Gson().fromJson(response.body?.string(), Array<Suspect>::class.java)
            runOnUiThread {
                displayWantedList(suspects)
            }
        }
    })
}
```

### React Web App Integration

```jsx
// React component example
import React, { useEffect, useState } from 'react';

function WantedList() {
  const [suspects, setSuspects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch('/api/v1/investigation/suspects/intensive_pursuit/')
      .then(response => response.json())
      .then(data => {
        setSuspects(data);
        setLoading(false);
      });
  }, []);
  
  if (loading) return <div>در حال بارگذاری...</div>;
  
  return (
    <div className="wanted-list">
      <h1>مظنونین تحت تعقیب شدید</h1>
      <div className="grid">
        {suspects.map(suspect => (
          <div key={suspect.id} className="wanted-card">
            <img src={suspect.photo || '/default.jpg'} alt={suspect.person_full_name} />
            <h2>{suspect.person_full_name}</h2>
            <p>پرونده: {suspect.case_title}</p>
            <p>جنایت: {suspect.crime_level_name}</p>
            <p className="days">روزهای فرار: {suspect.days_at_large}</p>
            <p className="reward">جایزه: {suspect.reward_amount.toLocaleString()} ریال</p>
            <div className="danger">
              <span>سطح خطر: {suspect.danger_score}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Troubleshooting

### Issue: Suspects not appearing in list

**Symptoms**: Endpoint returns empty array or missing suspects

**Possible Causes**:
1. Suspect not yet 30 days at large
2. Suspect status is arrested/cleared
3. Database timezone issues

**Solutions**:
```python
# Check suspect's days at large
suspect = Suspect.objects.get(id=123)
days = (timezone.now() - suspect.identified_at).days
print(f"Days at large: {days}")  # Should be > 30

# Check suspect status
print(f"Status: {suspect.status}")  # Should be under_pursuit or intensive_pursuit

# Verify timezone settings
from django.utils import timezone
print(f"Current time: {timezone.now()}")
print(f"Suspect identified: {suspect.identified_at}")
```

### Issue: Incorrect danger scores

**Symptoms**: Danger scores don't match expected values

**Debugging**:
```python
suspect = Suspect.objects.get(id=123)
days = (timezone.now() - suspect.identified_at).days
crime_level = suspect.case.crime_level.level
expected_score = days * (4 - crime_level)

print(f"Days: {days}")
print(f"Crime level: {crime_level}")
print(f"Expected score: {expected_score}")
print(f"Actual score: {suspect.get_danger_score()}")
```

### Issue: Status not auto-updating

**Symptoms**: Suspects remain in "under_pursuit" after 30+ days

**Explanation**: Status updates occur when endpoint is called (not background task)

**Solution**: Call endpoint to trigger update:
```bash
curl -X GET http://localhost:8000/api/v1/investigation/suspects/intensive_pursuit/
```

## Future Enhancements

### 1. Background Task for Status Updates

Currently, status updates happen when the endpoint is called. For automatic updates:

```python
# Use Celery for periodic updates
from celery import shared_task
from django.utils import timezone
from datetime import timedelta

@shared_task
def update_intensive_pursuit_statuses():
    """Run daily to update suspect statuses."""
    thirty_days_ago = timezone.now() - timedelta(days=30)
    suspects = Suspect.objects.filter(
        status=Suspect.STATUS_UNDER_PURSUIT,
        identified_at__lte=thirty_days_ago
    )
    
    count = suspects.update(status=Suspect.STATUS_INTENSIVE_PURSUIT)
    return f"Updated {count} suspects to intensive pursuit"

# Schedule in Celery beat
from celery.schedules import crontab

app.conf.beat_schedule = {
    'update-intensive-pursuit-daily': {
        'task': 'apps.investigation.tasks.update_intensive_pursuit_statuses',
        'schedule': crontab(hour=0, minute=0),  # Daily at midnight
    },
}
```

### 2. Geolocation Tracking

Add last known location for suspects:

```python
class Suspect(models.Model):
    # ... existing fields
    last_known_location = models.PointField(blank=True, null=True)
    last_seen_at = models.DateTimeField(blank=True, null=True)
    last_seen_address = models.CharField(max_length=500, blank=True)
```

### 3. Tips and Sightings

Allow public to report suspect sightings:

```python
class SuspectSighting(models.Model):
    suspect = models.ForeignKey(Suspect, on_delete=models.CASCADE, related_name='sightings')
    location = models.PointField()
    address = models.CharField(max_length=500)
    description = models.TextField()
    reported_by_name = models.CharField(max_length=200, blank=True)
    reported_by_phone = models.CharField(max_length=20, blank=True)
    reported_at = models.DateTimeField(auto_now_add=True)
    verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
```

### 4. Statistical Dashboard

Track intensive pursuit effectiveness:

```python
@action(detail=False, methods=['get'])
def statistics(self, request):
    """Get intensive pursuit statistics."""
    total_intensive = Suspect.objects.filter(
        status=Suspect.STATUS_INTENSIVE_PURSUIT
    ).count()
    
    arrests_from_intensive = Suspect.objects.filter(
        status=Suspect.STATUS_ARRESTED,
        # Track when status changed from intensive to arrested
    ).count()
    
    average_days_to_arrest = # Calculate average
    
    return Response({
        'total_intensive_pursuit': total_intensive,
        'arrests_from_intensive': arrests_from_intensive,
        'arrest_rate': arrests_from_intensive / total_intensive if total_intensive > 0 else 0,
        'average_days_to_arrest': average_days_to_arrest,
    })
```

## Summary

The Suspect Status System provides:

✅ **Automatic Tracking**: Suspects automatically transition to intensive pursuit after 30 days  
✅ **Public Awareness**: Publicly accessible wanted list increases chances of apprehension  
✅ **Priority Ranking**: Danger score ensures most dangerous suspects get most attention  
✅ **Incentive System**: Reward amounts incentivize public assistance  
✅ **Performance Optimized**: Efficient database queries with select_related  
✅ **Fully Tested**: 20 comprehensive tests covering all scenarios  
✅ **Well Documented**: Complete API documentation with examples

**Key Features**:
- Public endpoint requiring no authentication
- Automatic status updates based on time elapsed
- Formula-based danger scoring (days × crime severity)
- Proportional reward calculation
- Comprehensive filtering and sorting
- Privacy-conscious data exposure
- Production-ready performance

This system bridges the gap between police investigation and public cooperation, leveraging community awareness to apprehend dangerous suspects while maintaining appropriate privacy and security measures.
