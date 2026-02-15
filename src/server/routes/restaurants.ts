/**
 * Restaurant search routes (HotPepper API integration)
 */

import { Hono } from 'hono';
import type { AppEnv } from '../middleware/auth';
import { searchRestaurants } from '../lib/hotpepper';

const restaurants = new Hono<AppEnv>();

/**
 * GET /api/restaurants/search
 * Search restaurants via HotPepper API.
 *
 * Query parameters:
 *   - keyword: Search keyword
 *   - lat: Latitude (for location-based search)
 *   - lng: Longitude (for location-based search)
 *   - range: Search radius 1-5 (300m-3000m), used with lat/lng
 *   - large_area: HotPepper large area code
 *   - middle_area: HotPepper middle area code
 *   - budget: HotPepper budget code (e.g., B001, B002)
 *   - count: Number of results (default 10, max 100)
 *   - start: Result offset for pagination
 */
restaurants.get('/search', async (c) => {
  const apiKey = c.env.HOTPEPPER_API_KEY;

  if (!apiKey) {
    return c.json({ error: 'HotPepper API key is not configured' }, 500);
  }

  const query = c.req.query();

  try {
    const result = await searchRestaurants(apiKey, {
      keyword: query.keyword,
      lat: query.lat,
      lng: query.lng,
      range: query.range,
      large_area: query.large_area,
      middle_area: query.middle_area,
      budget: query.budget,
      count: query.count,
      start: query.start,
    });

    return c.json({
      results_available: result.resultsAvailable,
      results_returned: result.resultsReturned,
      results_start: result.resultsStart,
      shops: result.shops,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: `Failed to search restaurants: ${message}` }, 500);
  }
});

export default restaurants;
