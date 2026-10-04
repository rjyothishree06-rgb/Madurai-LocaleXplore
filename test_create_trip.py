
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

driver = webdriver.Chrome()
wait = WebDriverWait(driver, 15)

try:
    # Open the application
    driver.get(
        "file:///C:/Users/rames/OneDrive/Desktop/WT_web/"
        "madurai-localexplore/index.html"
    )
    print("Application opened successfully")

    # Open the Itineraries tab
    itineraries = wait.until(
        EC.element_to_be_clickable((
            By.CSS_SELECTOR,
            "a[ng-click=\"switchTab('itineraries')\"]"
        ))
    )
    itineraries.click()

    # Test 1: Check the heading
    wait.until(
        EC.visibility_of_element_located((
            By.XPATH,
            "//main[@id='view-itineraries']//h3"
            "[contains(., 'Create My Own Trip')]"
        ))
    )
    print("PASS: Create My Own Trip section is visible")

    # Test 2: Check the search field
    search = wait.until(
        EC.visibility_of_element_located((
            By.CSS_SELECTOR,
            "#view-itineraries input[ng-model='tripSearch']"
        ))
    )
    assert search.is_enabled()
    print("PASS: Search field is visible and enabled")

    # Test 3: Check the Create Plan button
    create_button = wait.until(
        EC.element_to_be_clickable((
            By.CSS_SELECTOR,
            "#view-itineraries button[ng-click='createPlan()']"
        ))
    )
    print("PASS: Create Plan button is visible and enabled")

    # Test 4: Search and click the actual place suggestion
    search.send_keys("Meenakshi")

    suggestion = wait.until(
        EC.element_to_be_clickable((
            By.XPATH,
            "//*[@ng-click='selectPlace(place); addPlaceToTrip()'"
            " and contains(., 'Meenakshi')]"
        ))
    )
    suggestion.click()

    # Verify the place appears in the custom itinerary
    wait.until(
        EC.visibility_of_element_located((
            By.XPATH,
            "//*[@ng-repeat='place in customTrip track by $index'"
            " and contains(., 'Meenakshi')]"
        ))
    )
    print("PASS: Meenakshi was added to the itinerary")

    # Test 5: Create the trip plan
    title_input = wait.until(
        EC.visibility_of_element_located((
            By.CSS_SELECTOR,
            "#view-itineraries input[ng-model='newPlanTitle']"
        ))
    )
    title_input.clear()
    title_input.send_keys("Selenium Test Plan")

    create_button.click()

    # Handle an unexpected validation alert separately
    try:
        alert = WebDriverWait(driver, 3).until(
            EC.alert_is_present()
        )
        print("FAIL: " + alert.text)
        alert.accept()

    except Exception:
        # Verify the newly created plan
        created_plan = wait.until(
            EC.visibility_of_element_located((
                By.XPATH,
                "//*[contains(@class, 'created-plan-card')"
                " and contains(., 'Selenium Test Plan')]"
            ))
        )

        assert "Meenakshi" in created_plan.text
        print("PASS: Trip plan created successfully")
        print("PASS: Created plan contains Meenakshi")
        print("\nAll 5 Selenium tests passed!")

finally:
    driver.quit()
