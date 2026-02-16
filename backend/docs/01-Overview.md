# LA Noire NextGen - System Overview

## Introduction

LA Noire NextGen is a comprehensive police management system inspired by the LA Noire video game. In 2025, the Los Angeles Police Department has decided to automate their operations and digitize their data storage, which was previously done manually on paper (set in the late 1940s in the game).

## Purpose

This web-based system enables the police department to:
- Manage criminal case workflows from complaint to verdict
- Track and organize evidence digitally
- Coordinate investigations with detective boards
- Monitor suspects and wanted criminals
- Process trials and verdicts
- Handle public tip-offs with rewards

## System Architecture

### Technology Stack
- **Backend Framework**: Django 4.2 with Django REST Framework
- **Database**: PostgreSQL (recommended)
- **API Documentation**: drf-spectacular (OpenAPI 3.0)
- **Authentication**: Django Session-based authentication

### Application Structure

The system is divided into 5 main Django apps:

1. **[[02-Accounts-App|Accounts]]** - User management and dynamic role system
2. **[[03-Cases-App|Cases]]** - Criminal case formation and tracking
3. **[[04-Evidence-App|Evidence]]** - Evidence collection and management
4. **[[05-Investigation-App|Investigation]]** - Detective work, suspects, and interrogations
5. **[[06-Trial-App|Trial]]** - Court trials, verdicts, and punishments

## Key Features

### Dynamic Role System
- Administrator can create, modify, and delete roles without code changes
- Users can have multiple roles
- Pre-defined roles include: Administrator, Chief, Captain, Sergeant, Detective, Police Officer, Patrol Officer, Cadet, Judge, Coroner, and civilian roles

### Case Formation Workflows
Two ways to create cases:
1. **Complaint-based**: Citizen files complaint → Cadet reviews → Officer approves
2. **Crime Scene-based**: Officer reports crime scene → Supervisor approves

### Evidence Management
Multiple evidence types supported:
- Witness testimony (with media attachments)
- Biological/medical evidence (requires forensic verification)
- Vehicle evidence
- ID documents (flexible key-value attributes)
- Generic evidence

### Investigation System
- Detective boards for organizing evidence
- Visual evidence connections (red lines)
- Suspect identification and tracking
- Interrogation records with guilt ratings
- Public tip-off system with rewards

### Trial System
- Complete case file presented to judge
- Verdict recording (guilty/innocent)
- Punishment assignment
- Bail payment option for eligible suspects

### Wanted List & Rewards
- Suspects under pursuit for >30 days appear on public wanted list
- Danger score calculated: `max(days_pursued) × max(crime_level)`
- Reward amount: `danger_score × 20,000,000 Rials`

## Crime Severity Levels

| Level | Name | Description | Examples |
|-------|------|-------------|----------|
| 3 | Minor | Low-severity crimes | Petty theft, minor fraud |
| 2 | Medium | Moderate crimes | Car theft, burglary |
| 1 | Major | Serious crimes | Murder, armed robbery |
| 0 | Critical | Severe/mass crimes | Serial murder, terrorism |

## User Authentication

Users can login with any of these unique identifiers:
- Username
- Email
- Phone number
- National ID

All paired with password for authentication.

## Next Steps

- [[02-User-Roles|Learn about user roles and permissions]]
- [[03-Case-Workflows|Understand case workflows]]
- [[07-API-Reference|Explore the API reference]]
