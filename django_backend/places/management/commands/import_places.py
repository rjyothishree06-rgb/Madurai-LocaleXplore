import json
from pathlib import Path
from django.core.management.base import BaseCommand
from places.models import Place


class Command(BaseCommand):
    help = 'Imports existing tourist places from server/data/places.json into Django SQLite database.'

    def handle(self, *args, **options):
        # Locate places.json file
        base_dir = Path(__file__).resolve().parent.parent.parent.parent.parent
        json_path = base_dir / 'server' / 'data' / 'places.json'

        if not json_path.exists():
            # Fallback path relative to django_backend
            json_path = Path(__file__).resolve().parent.parent.parent.parent / 'server' / 'data' / 'places.json'

        if not json_path.exists():
            self.stderr.write(self.style.ERROR(f'Could not find places.json at {json_path}'))
            return

        self.stdout.write(f'Reading places data from: {json_path}')
        with open(json_path, 'r', encoding='utf-8') as f:
            places_data = json.load(f)

        imported_count = 0
        for item in places_data:
            coords = item.get('coordinates', {}) or {}
            lat = coords.get('lat') if isinstance(coords, dict) else None
            lng = coords.get('lng') if isinstance(coords, dict) else None

            place, created = Place.objects.update_or_create(
                id=item['id'],
                defaults={
                    'name': item.get('name', ''),
                    'category': item.get('category', ''),
                    'categoryLabel': item.get('categoryLabel', ''),
                    'isPopular': item.get('isPopular', False),
                    'rating': item.get('rating', 0.0),
                    'reviews': item.get('reviews', 0),
                    'image': item.get('image', ''),
                    'description': item.get('description', ''),
                    'fullStory': item.get('fullStory', ''),
                    'timings': item.get('timings', ''),
                    'entryFee': item.get('entryFee', 0.0),
                    'extraFee': item.get('extraFee', ''),
                    'dressCode': item.get('dressCode', ''),
                    'bestTimeToVisit': item.get('bestTimeToVisit', ''),
                    'latitude': lat,
                    'longitude': lng,
                    'address': item.get('address', ''),
                    'busLines': item.get('busLines', []),
                    'tags': item.get('tags', [])
                }
            )

            status = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f'  - {status}: [{place.id}] {place.name}'))
            imported_count += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully imported {imported_count} places into SQLite database!'))
