# Battery Database

An internal management app for the team to maintain a database of home battery products used by the solar and battery calculator.

**Who it's for:** Internal team members who manage battery product data, installer relationships, and energy plan compatibility.

**What it does:**
- Manages a catalog of home batteries with full specs (capacity, charge/discharge rates, efficiency, cycle warranty, depth of discharge)
- Tracks multiple capacity configurations per battery with price ranges
- Maintains a network of installers with per-battery, per-capacity pricing
- Manages energy plans with tariff types and bi-directional charging parameters
- Provides a rich API endpoint (`getBatteriesForCalculator`) that the external solar calculator app calls to pull fully enriched battery summary cards with images, specs, capacity options, installer pricing, and compatible energy plans
