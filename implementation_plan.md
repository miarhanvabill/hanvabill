# Public Booking Page Redesign

We will completely overhaul the `app/book/[slug]/page.tsx` UI to match the modern, premium aesthetic shown in the reference screenshots (Zylu style).

## 1. Top Section (Cover & Info)
- Add a large placeholder cover image (using a generic salon stock image or gradient).
- Create a floating business info card that overlaps the bottom of the cover image.
- Include "Open Now" badge, business name, location, and action buttons (Call, Share, Socials).

## 2. Navigation Tabs
- Add a sticky horizontal scrollable tab menu: `[Featured, Services, Products, Packages, Memberships, Enquiry]`.
- Highlight "Services" as active.

## 3. Categories Grid
- Below the tabs, add a search bar and gender filter toggles (All, Male, Female).
- Build a responsive CSS grid of categories.
- Since we don't have category images in the database, we will use a set of generic Unsplash placeholder images mapped to common salon categories (Hair, Skin, Nails, etc.), with a fallback gradient for unknown categories.
- Clicking a category in this grid will act as a quick-filter or smooth-scroll to that section.

## 4. Services List
- Redesign the service list to look cleaner, with the price and duration right-aligned.
- Add an "Add" button next to each service instead of immediately jumping to the Date/Time step.
- This allows multi-service selection (though we'll keep the single-service booking logic for now by advancing to the next step, or upgrading it to a cart system if we have time). For now, clicking "Add" will select the service and open the Date/Time modal or proceed to Step 2.

## 5. Floating Action Bar
- Add a fixed dark bottom bar "Add Services or Products to Book Now" which activates when a service is selected.

I will implement this layout using Tailwind CSS and `lucide-react` icons.
