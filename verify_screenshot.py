from playwright.sync_api import sync_playwright
import time

def verify_screenshot_settings():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:3000")

        print("Loaded page")

        # Wait for loading banner to disappear
        try:
            page.wait_for_selector('[data-testid="loading-banner"]', state="hidden", timeout=10000)
        except:
            print("Loading banner did not disappear")

        # Expand 'models'
        try:
            page.get_by_text("models", exact=True).click(timeout=5000)
            page.get_by_text("deadbods", exact=True).click()
            page.get_by_text("dude", exact=True).click()
            page.get_by_text("tris.md2", exact=True).click()
            print("Selected tris.md2")
        except Exception as e:
            print(f"Failed to navigate file tree: {e}")
            page.screenshot(path="verification_failure_nav.png")
            browser.close()
            return

        # Wait for viewer canvas
        try:
            page.wait_for_selector("canvas.md2-viewer-canvas", timeout=5000)
            # Wait a bit for render
            time.sleep(1)
        except:
            print("Canvas not found")
            page.screenshot(path="verification_failure_canvas.png")
            browser.close()
            return

        # Click Screenshot button
        try:
            page.get_by_title("Take Screenshot").click()
            print("Clicked screenshot button")
        except:
            print("Screenshot button not found")
            page.screenshot(path="verification_failure_btn.png")
            browser.close()
            return

        # Wait for dialog
        try:
            page.wait_for_selector(".screenshot-settings-modal", timeout=2000)
            print("Dialog appeared")
        except:
            print("Dialog not found")
            page.screenshot(path="verification_failure_dialog.png")
            browser.close()
            return

        # Verify text
        try:
            multiplier = page.get_by_label("Resolution Multiplier:")
            if multiplier.is_visible():
                print("Resolution Multiplier label found")
            else:
                print("Resolution Multiplier label NOT visible")
        except Exception as e:
             print(f"Resolution Multiplier check failed: {e}")

        # Take screenshot
        page.screenshot(path="verification_screenshot_settings.png")
        print("Screenshot taken")

        browser.close()

if __name__ == "__main__":
    verify_screenshot_settings()
