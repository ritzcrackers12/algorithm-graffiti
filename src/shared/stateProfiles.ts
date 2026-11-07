/** DRAFT: verify before the show. 2024 presidential lean is approximate. */

export type UrbanRural = 'urban' | 'mixed' | 'rural'

export interface StateProfile {
  name: string
  abbr: string
  region: string
  /** -2 strong D … +2 strong R, from 2024 presidential margin */
  partisanLean: -2 | -1 | 0 | 1 | 2
  urbanRural: UrbanRural
  topIndustries: string[]
  topIssues: string[]
  notes: string
}

const s = (
  name: string,
  abbr: string,
  region: string,
  partisanLean: StateProfile['partisanLean'],
  urbanRural: UrbanRural,
  topIndustries: string[],
  topIssues: string[],
  notes: string,
): StateProfile => ({ name, abbr, region, partisanLean, urbanRural, topIndustries, topIssues, notes })

export const STATE_PROFILES: StateProfile[] = [
  s('Alabama', 'AL', 'South', 2, 'mixed', ['manufacturing', 'agriculture', 'aerospace', 'healthcare'], ['factory jobs', 'energy costs', 'rural healthcare', 'trade'], 'Heavy manufacturing and farm counties.'),
  s('Alaska', 'AK', 'West', 1, 'rural', ['oil and gas', 'fishing', 'federal government', 'tourism'], ['energy', 'cost of living', 'rural healthcare', 'federal land'], 'Resource extraction and high living costs.'),
  s('Arizona', 'AZ', 'West', 1, 'mixed', ['semiconductors', 'tourism', 'defense', 'real estate'], ['housing costs', 'water', 'border', 'retirement'], 'Phoenix growth, water and housing pressure.'),
  s('Arkansas', 'AR', 'South', 2, 'rural', ['agriculture', 'logistics', 'poultry', 'retail HQs'], ['farm prices', 'rural healthcare', 'wages', 'trade'], 'Agriculture and warehouse logistics.'),
  s('California', 'CA', 'West', -2, 'urban', ['tech', 'entertainment', 'agriculture', 'ports'], ['housing costs', 'AI and regulation', 'wildfire', 'immigration'], 'Tech and housing dominate the conversation.'),
  s('Colorado', 'CO', 'West', -1, 'mixed', ['tech', 'energy', 'aerospace', 'tourism'], ['housing costs', 'water', 'energy', 'outdoors'], 'Front Range tech meets energy counties.'),
  s('Connecticut', 'CT', 'Northeast', -2, 'urban', ['finance', 'insurance', 'defense', 'healthcare'], ['taxes', 'housing', 'commuting', 'schools'], 'Finance and high costs around New York.'),
  s('Delaware', 'DE', 'Northeast', -2, 'mixed', ['finance', 'chemicals', 'logistics', 'healthcare'], ['corporate law', 'wages', 'coastal flooding', 'healthcare'], 'Banking and chemicals along the corridor.'),
  s('District of Columbia', 'DC', 'Northeast', -2, 'urban', ['federal government', 'lobbying', 'education', 'hospitality'], ['federal jobs', 'housing costs', 'public services', 'inequality'], 'The federal workforce is the local economy.'),
  s('Florida', 'FL', 'South', 1, 'mixed', ['tourism', 'logistics', 'agriculture', 'healthcare'], ['insurance', 'housing', 'hurricanes', 'retirement'], 'Insurance, storms and in-migration.'),
  s('Georgia', 'GA', 'South', 1, 'mixed', ['logistics', 'film', 'agriculture', 'auto'], ['jobs', 'housing in Atlanta', 'rural hospitals', 'trade'], 'Atlanta logistics plus farm and auto country.'),
  s('Hawaii', 'HI', 'West', -2, 'mixed', ['tourism', 'military', 'agriculture', 'healthcare'], ['cost of living', 'housing', 'tourism jobs', 'climate'], 'Islands live on tourism and federal spending.'),
  s('Idaho', 'ID', 'West', 2, 'rural', ['agriculture', 'tech', 'timber', 'mining'], ['housing growth', 'water', 'farm prices', 'public land'], 'Boise growth over a farm-and-timber base.'),
  s('Illinois', 'IL', 'Midwest', -2, 'urban', ['finance', 'manufacturing', 'agriculture', 'logistics'], ['taxes', 'Chicago housing', 'farm prices', 'pensions'], 'Chicago finance against downstate farms.'),
  s('Indiana', 'IN', 'Midwest', 2, 'mixed', ['manufacturing', 'agriculture', 'pharma', 'logistics'], ['factory jobs', 'auto', 'farm prices', 'trade'], 'Auto and steel still define many towns.'),
  s('Iowa', 'IA', 'Midwest', 1, 'rural', ['agriculture', 'insurance', 'manufacturing', 'biofuels'], ['crop prices', 'trade', 'rural healthcare', 'ethanol'], 'Corn, soy, insurance and caucuses.'),
  s('Kansas', 'KS', 'Midwest', 2, 'rural', ['agriculture', 'aviation', 'energy', 'military'], ['crop prices', 'trade', 'rural healthcare', 'energy'], 'Wheat, Wichita aviation and military bases.'),
  s('Kentucky', 'KY', 'South', 2, 'rural', ['manufacturing', 'agriculture', 'logistics', 'energy'], ['factory jobs', 'rural hospitals', 'energy', 'opioids'], 'Auto plants and Appalachian counties.'),
  s('Louisiana', 'LA', 'South', 2, 'mixed', ['oil and gas', 'ports', 'agriculture', 'tourism'], ['energy', 'hurricanes', 'coastal land loss', 'wages'], 'Gulf energy and port traffic.'),
  s('Maine', 'ME', 'Northeast', -1, 'rural', ['healthcare', 'fishing', 'forestry', 'tourism'], ['rural healthcare', 'heating costs', 'fisheries', 'aging'], 'Older, rural, heating-oil dependent.'),
  s('Maryland', 'MD', 'Northeast', -2, 'urban', ['federal government', 'biotech', 'ports', 'defense'], ['federal jobs', 'housing', 'commuting', 'schools'], 'Beltway agencies and Baltimore port.'),
  s('Massachusetts', 'MA', 'Northeast', -2, 'urban', ['education', 'biotech', 'finance', 'healthcare'], ['housing costs', 'colleges', 'healthcare', 'transit'], 'Universities and hospitals set the tone.'),
  s('Michigan', 'MI', 'Midwest', 0, 'mixed', ['auto', 'manufacturing', 'agriculture', 'healthcare'], ['factory jobs', 'auto transition', 'trade', 'Great Lakes'], 'The auto map still decides elections.'),
  s('Minnesota', 'MN', 'Midwest', -1, 'mixed', ['healthcare', 'agriculture', 'manufacturing', 'retail HQs'], ['healthcare costs', 'farm prices', 'Twin Cities housing', 'unions'], 'Medical devices and a farm hinterland.'),
  s('Mississippi', 'MS', 'South', 2, 'rural', ['agriculture', 'manufacturing', 'energy', 'shipbuilding'], ['rural healthcare', 'wages', 'factory jobs', 'energy'], 'Lowest incomes, rural hospitals, Gulf yards.'),
  s('Missouri', 'MO', 'Midwest', 2, 'mixed', ['agriculture', 'manufacturing', 'logistics', 'healthcare'], ['farm prices', 'factory jobs', 'St. Louis / KC', 'rural hospitals'], 'Two cities and a large farm middle.'),
  s('Montana', 'MT', 'West', 2, 'rural', ['agriculture', 'energy', 'tourism', 'mining'], ['housing in boom towns', 'public land', 'energy', 'rural healthcare'], 'Ranching, energy and in-migration.'),
  s('Nebraska', 'NE', 'Midwest', 2, 'rural', ['agriculture', 'rail', 'finance', 'meatpacking'], ['crop prices', 'trade', 'immigration and packing plants', 'rural hospitals'], 'Beef, corn and Omaha finance.'),
  s('Nevada', 'NV', 'West', 0, 'mixed', ['hospitality', 'mining', 'logistics', 'tech'], ['service jobs', 'housing in Las Vegas', 'tourism', 'water'], 'Casinos, warehouses and desert growth.'),
  s('New Hampshire', 'NH', 'Northeast', -1, 'mixed', ['healthcare', 'tech', 'manufacturing', 'tourism'], ['housing', 'property taxes', 'healthcare', 'energy costs'], 'No income tax, high property tax, Boston spillover.'),
  s('New Jersey', 'NJ', 'Northeast', -1, 'urban', ['pharma', 'finance', 'ports', 'logistics'], ['property taxes', 'commuting', 'housing', 'insurance'], 'Dense suburbs facing New York.'),
  s('New Mexico', 'NM', 'West', -1, 'mixed', ['federal labs', 'energy', 'tourism', 'agriculture'], ['oil and gas', 'water', 'rural healthcare', 'federal jobs'], 'Labs, energy and a large rural expanse.'),
  s('New York', 'NY', 'Northeast', -2, 'urban', ['finance', 'media', 'healthcare', 'education'], ['housing costs', 'taxes', 'transit', 'upstate jobs'], 'NYC finance versus upstate decline.'),
  s('North Carolina', 'NC', 'South', 1, 'mixed', ['banking', 'tech', 'manufacturing', 'agriculture'], ['housing in the Triangle', 'factory jobs', 'hurricanes', 'rural hospitals'], 'Banks, research triangle, furniture towns.'),
  s('North Dakota', 'ND', 'Midwest', 2, 'rural', ['energy', 'agriculture', 'mining'], ['oil jobs', 'farm prices', 'rural healthcare', 'energy regulation'], 'Bakken oil and wheat.'),
  s('Ohio', 'OH', 'Midwest', 1, 'mixed', ['manufacturing', 'healthcare', 'agriculture', 'energy'], ['factory jobs', 'trade', 'energy costs', 'rural healthcare'], 'Factory towns still define the economy.'),
  s('Oklahoma', 'OK', 'South', 2, 'mixed', ['energy', 'aerospace', 'agriculture', 'tribal enterprise'], ['energy', 'rural hospitals', 'tornadoes', 'wages'], 'Oil, gas and aviation.'),
  s('Oregon', 'OR', 'West', -2, 'mixed', ['tech', 'timber', 'agriculture', 'apparel'], ['housing in Portland', 'timber towns', 'wildfire', 'homelessness'], 'Portland tech against timber counties.'),
  s('Pennsylvania', 'PA', 'Northeast', 0, 'mixed', ['healthcare', 'energy', 'manufacturing', 'education'], ['factory jobs', 'fracking', 'Philadelphia / Pittsburgh', 'rural hospitals'], 'The original swing-state mix.'),
  s('Rhode Island', 'RI', 'Northeast', -2, 'urban', ['healthcare', 'education', 'ports', 'tourism'], ['housing', 'healthcare costs', 'wages', 'coastal flooding'], 'Small, dense, hospital-heavy.'),
  s('South Carolina', 'SC', 'South', 2, 'mixed', ['manufacturing', 'tourism', 'military', 'agriculture'], ['factory jobs', 'hurricanes', 'rural hospitals', 'housing on the coast'], 'Foreign auto plants and the coast.'),
  s('South Dakota', 'SD', 'Midwest', 2, 'rural', ['agriculture', 'finance', 'tourism', 'meatpacking'], ['farm prices', 'rural healthcare', 'taxes', 'tourism'], 'Cattle, credit-card HQs, Badlands.'),
  s('Tennessee', 'TN', 'South', 2, 'mixed', ['auto', 'healthcare', 'logistics', 'music'], ['factory jobs', 'Nashville housing', 'rural hospitals', 'trade'], 'Auto corridor plus a booming capital.'),
  s('Texas', 'TX', 'South', 1, 'mixed', ['energy', 'tech', 'trade', 'agriculture'], ['energy', 'border', 'housing in the metros', 'grid'], 'Oil, chips, ports and a long border.'),
  s('Utah', 'UT', 'West', 2, 'mixed', ['tech', 'mining', 'defense', 'tourism'], ['housing along the Wasatch', 'water', 'public land', 'tech jobs'], 'Young, fast-growing, tech plus extraction.'),
  s('Vermont', 'VT', 'Northeast', -2, 'rural', ['healthcare', 'education', 'agriculture', 'tourism'], ['rural healthcare', 'housing', 'dairy', 'energy costs'], 'Small, rural, high education.'),
  s('Virginia', 'VA', 'South', -1, 'mixed', ['federal government', 'defense', 'tech', 'ports'], ['federal jobs', 'NOVA housing', 'military', 'rural southside'], 'Pentagon suburbs versus rural south.'),
  s('Washington', 'WA', 'West', -2, 'urban', ['tech', 'aerospace', 'agriculture', 'ports'], ['housing in Seattle', 'AI and regulation', 'trade', 'wildfire'], 'Boeing, Amazon, ports and orchards.'),
  s('West Virginia', 'WV', 'South', 2, 'rural', ['energy', 'healthcare', 'chemicals', 'timber'], ['coal and gas jobs', 'rural hospitals', 'opioids', 'aging'], 'Energy extraction and an older population.'),
  s('Wisconsin', 'WI', 'Midwest', 0, 'mixed', ['manufacturing', 'agriculture', 'healthcare', 'dairy'], ['factory jobs', 'dairy prices', 'rural hospitals', 'trade'], 'Plants and dairy in a perennial toss-up.'),
  s('Wyoming', 'WY', 'West', 2, 'rural', ['energy', 'agriculture', 'tourism', 'mining'], ['coal and gas', 'public land', 'rural healthcare', 'boom-bust'], 'The most extraction-heavy state.'),
]

export const COUNTRY_NAMES = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahrain', 'Bangladesh', 'Belarus', 'Belgium', 'Bolivia', 'Bosnia and Herzegovina',
  'Brazil', 'Bulgaria', 'Cambodia', 'Cameroon', 'Canada', 'Chile', 'China', 'Colombia',
  'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czechia', 'Denmark', 'Dominican Republic',
  'Ecuador', 'Egypt', 'El Salvador', 'Estonia', 'Ethiopia', 'Finland', 'France',
  'Georgia (country)', 'Germany', 'Ghana', 'Greece', 'Guatemala', 'Haiti', 'Honduras', 'Hong Kong', 'Hungary',
  'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica',
  'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait', 'Latvia', 'Lebanon', 'Lithuania',
  'Luxembourg', 'Malaysia', 'Mexico', 'Morocco', 'Myanmar', 'Nepal', 'Netherlands',
  'New Zealand', 'Nicaragua', 'Nigeria', 'North Korea', 'Norway', 'Oman', 'Pakistan',
  'Panama', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia',
  'Saudi Arabia', 'Senegal', 'Serbia', 'Singapore', 'Slovakia', 'Slovenia', 'South Africa',
  'South Korea', 'Spain', 'Sri Lanka', 'Sweden', 'Switzerland', 'Syria', 'Taiwan',
  'Tanzania', 'Thailand', 'Tunisia', 'Turkey', 'Uganda', 'Ukraine', 'United Arab Emirates',
  'United Kingdom', 'Uruguay', 'Venezuela', 'Vietnam', 'Yemen', 'Zimbabwe',
]

export const COUNTRY_ALIASES: Record<string, string> = {
  uk: 'United Kingdom', britain: 'United Kingdom', england: 'United Kingdom',
  'great britain': 'United Kingdom', uae: 'United Arab Emirates',
  korea: 'South Korea', 'republic of korea': 'South Korea',
  'czech republic': 'Czechia', holland: 'Netherlands',
  'the netherlands': 'Netherlands', 'the united kingdom': 'United Kingdom',
  palestine: 'Palestine', 'republic of georgia': 'Georgia (country)',
}
