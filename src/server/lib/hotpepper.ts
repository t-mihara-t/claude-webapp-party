/**
 * HotPepper Gourmet Search API helper
 *
 * Proxies requests to the HotPepper API, which returns XML responses.
 * Parses the XML using regex (no XML parser available in Workers runtime).
 */

const HOTPEPPER_API_URL = 'http://webservice.recruit.co.jp/hotpepper/gourmet/v1/';

export interface HotPepperSearchParams {
  keyword?: string;
  lat?: string;
  lng?: string;
  range?: string; // 1-5 (300m - 3000m)
  large_area?: string;
  middle_area?: string;
  budget?: string; // budget code like B001, B002 etc.
  count?: string;
  start?: string;
}

export interface HotPepperShop {
  id: string;
  name: string;
  address: string;
  access: string;
  budget: string;
  budgetAverage: string;
  photo: string;
  url: string;
  open: string;
  close: string;
  lat: string;
  lng: string;
  genre: string;
  catch: string;
}

export interface HotPepperSearchResult {
  resultsAvailable: number;
  resultsReturned: number;
  resultsStart: number;
  shops: HotPepperShop[];
}

/**
 * Extract text content from a simple XML tag using regex.
 * Handles both <tag>value</tag> and <tag/> (empty) patterns.
 */
function extractTag(xml: string, tagName: string): string {
  // Try to match content between opening and closing tags
  const regex = new RegExp(`<${tagName}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tagName}>|<${tagName}>([^<]*)</${tagName}>`);
  const match = xml.match(regex);
  if (match) {
    return (match[1] ?? match[2] ?? '').trim();
  }
  return '';
}

/**
 * Extract all <shop> blocks from the API response XML.
 */
function extractShops(xml: string): string[] {
  const shops: string[] = [];
  const regex = /<shop>([\s\S]*?)<\/shop>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    shops.push(match[1]);
  }
  return shops;
}

/**
 * Parse a single shop XML block into a HotPepperShop object.
 */
function parseShop(shopXml: string): HotPepperShop {
  // Extract budget info from nested <budget> tag
  const budgetBlock = shopXml.match(/<budget>([\s\S]*?)<\/budget>/);
  const budgetName = budgetBlock ? extractTag(budgetBlock[1], 'name') : '';
  const budgetAverage = extractTag(shopXml, 'budget_memo') || budgetName;

  // Extract photo - try to get the main shop photo
  const photoBlock = shopXml.match(/<photo>([\s\S]*?)<\/photo>/);
  let photoUrl = '';
  if (photoBlock) {
    const pcBlock = photoBlock[1].match(/<pc>([\s\S]*?)<\/pc>/);
    if (pcBlock) {
      photoUrl = extractTag(pcBlock[1], 'l') || extractTag(pcBlock[1], 'm') || extractTag(pcBlock[1], 's');
    }
  }

  // Extract genre name from nested <genre> tag
  const genreBlock = shopXml.match(/<genre>([\s\S]*?)<\/genre>/);
  const genreName = genreBlock ? extractTag(genreBlock[1], 'name') : '';

  // Extract URLs block
  const urlsBlock = shopXml.match(/<urls>([\s\S]*?)<\/urls>/);
  const shopUrl = urlsBlock ? extractTag(urlsBlock[1], 'pc') : '';

  return {
    id: extractTag(shopXml, 'id'),
    name: extractTag(shopXml, 'name'),
    address: extractTag(shopXml, 'address'),
    access: extractTag(shopXml, 'access'),
    budget: budgetName,
    budgetAverage: budgetAverage,
    photo: photoUrl,
    url: shopUrl,
    open: extractTag(shopXml, 'open'),
    close: extractTag(shopXml, 'close'),
    lat: extractTag(shopXml, 'lat'),
    lng: extractTag(shopXml, 'lng'),
    genre: genreName,
    catch: extractTag(shopXml, 'catch'),
  };
}

/**
 * Search the HotPepper Gourmet API.
 *
 * @param apiKey - HotPepper API key
 * @param params - Search parameters
 * @returns Parsed search results
 */
export async function searchRestaurants(
  apiKey: string,
  params: HotPepperSearchParams
): Promise<HotPepperSearchResult> {
  const url = new URL(HOTPEPPER_API_URL);

  // Always set the API key and format
  url.searchParams.set('key', apiKey);
  url.searchParams.set('format', 'xml');

  // Set optional search parameters
  if (params.keyword) url.searchParams.set('keyword', params.keyword);
  if (params.lat) url.searchParams.set('lat', params.lat);
  if (params.lng) url.searchParams.set('lng', params.lng);
  if (params.range) url.searchParams.set('range', params.range);
  if (params.large_area) url.searchParams.set('large_area', params.large_area);
  if (params.middle_area) url.searchParams.set('middle_area', params.middle_area);
  if (params.budget) url.searchParams.set('budget', params.budget);
  if (params.count) url.searchParams.set('count', params.count);
  if (params.start) url.searchParams.set('start', params.start);

  // Default to 10 results if not specified
  if (!params.count) {
    url.searchParams.set('count', '10');
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`HotPepper API returned status ${response.status}`);
  }

  const xml = await response.text();

  // Parse results metadata
  const resultsAvailable = parseInt(extractTag(xml, 'results_available') || '0', 10);
  const resultsReturned = parseInt(extractTag(xml, 'results_returned') || '0', 10);
  const resultsStart = parseInt(extractTag(xml, 'results_start') || '1', 10);

  // Parse individual shops
  const shopBlocks = extractShops(xml);
  const shops = shopBlocks.map(parseShop);

  return {
    resultsAvailable,
    resultsReturned,
    resultsStart,
    shops,
  };
}
