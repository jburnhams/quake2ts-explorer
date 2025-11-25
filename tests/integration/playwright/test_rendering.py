from playwright.sync_api import Page, expect, sync_playwright

def test_rendering_modes(page: Page):
  """
  This test verifies that the rendering mode and color controls
  are working correctly for an MD2 model.
  """
  # 1. Arrange: Go to the application.
  page.goto("http://localhost:3000")

  # 2. Act: Click the default pak file to load a model.
  page.wait_for_selector("text=pak.pak")
  page.get_by_text("pak.pak").click()
  page.get_by_text("test.md2").click()

  # 3. Act: Select the wireframe rendering mode.
  wireframe_button = page.get_by_role("button", name="Wireframe")
  wireframe_button.click()

  # 4. Act: Select the red color.
  red_button = page.get_by_label("Red")
  red_button.click()

  # 5. Screenshot: Capture the wireframe result for visual verification.
  page.screenshot(path="tests/integration/playwright/wireframe.png")

  # 6. Act: Select the solid rendering mode.
  solid_button = page.get_by_role("button", name="Solid")
  solid_button.click()

  # 7. Screenshot: Capture the solid result for visual verification.
  page.screenshot(path="tests/integration/playwright/solid.png")

if __name__ == "__main__":
  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    try:
      test_rendering_modes(page)
    finally:
      browser.close()
