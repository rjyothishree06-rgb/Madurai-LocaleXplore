
const fs = require('fs');
const path = require('path');

describe('Madurai LocaleXplore CI Tests', () => {
  test('Main website file exists', () => {
    const filePath = path.join(__dirname, 'index.html');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('Selenium test file exists', () => {
    const filePath = path.join(__dirname, 'test_create_trip.py');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('JavaScript source folder exists', () => {
    const folderPath = path.join(__dirname, 'js');
    expect(fs.existsSync(folderPath)).toBe(true);
  });
});