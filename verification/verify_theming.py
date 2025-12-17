from playwright.sync_api import sync_playwright

def verify_theming():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Wait for server to start
            page.goto("http://localhost:3000", timeout=30000)

            # Open Settings
            # The button has text "⚙️" and title "Settings"
            page.get_by_role("button", name="⚙️").click()

            # Check default theme (Dark)
            # We can check background color of body or some element
            # But visuals are better checked via screenshot

            page.screenshot(path="verification/default_theme.png")

            # Change to Light Theme
            page.get_by_test_id("theme-select").select_option("light")

            # Wait a bit for transition
            page.wait_for_timeout(500)

            page.screenshot(path="verification/light_theme.png")

            # Change to High Contrast
            page.get_by_test_id("theme-select").select_option("high-contrast")

            page.wait_for_timeout(500)

            page.screenshot(path="verification/high_contrast_theme.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_theming()
