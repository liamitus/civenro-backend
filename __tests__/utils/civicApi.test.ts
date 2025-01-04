import axios from 'axios';
import { getRepresentativesByAddress } from '../../src/utils/civicApi';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('getRepresentativesByAddress', () => {
  const address = '1600 Pennsylvania Avenue NW, Washington, DC 20500';

  it('should fetch representatives and return transformed data', async () => {
    const mockResponseData = {
      offices: [
        {
          name: 'U.S. Senator',
          officialIndices: [0],
        },
        {
          name: 'U.S. Representative',
          officialIndices: [1],
        },
      ],
      officials: [
        {
          name: 'John Doe',
          photoUrl: 'https://bioguide.congress.gov/J/J000001.jpg',
        },
        {
          name: 'Jane Smith',
          photoUrl: 'https://bioguide.congress.gov/S/S000148.jpg',
        },
      ],
    };

    mockedAxios.get.mockResolvedValueOnce({ data: mockResponseData });

    const data = await getRepresentativesByAddress(address);

    // Check that axios was called with correct parameters
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://www.googleapis.com/civicinfo/v2/representatives',
      expect.objectContaining({
        params: expect.objectContaining({
          address,
          key: process.env.GOOGLE_CIVIC_API_KEY,
          roles: ['legislatorLowerBody', 'legislatorUpperBody'],
          levels: ['country'],
        }),
      })
    );

    // Check data transformations
    expect(data).toBeDefined();
    expect(data.officials.length).toBe(2);

    const senator = data.officials[0];
    expect(senator.name).toBe('John Doe');
    expect(senator.bioguideId).toBe('J000001');
    expect(senator.chamber).toBe('senator');

    const representative = data.officials[1];
    expect(representative.name).toBe('Jane Smith');
    expect(representative.bioguideId).toBe('S000148');
    expect(representative.chamber).toBe('representative');
  });

  it('should throw an error if the request fails', async () => {
    const mockError = new Error('Expected test error');
    mockedAxios.get.mockRejectedValueOnce(mockError);

    await expect(getRepresentativesByAddress(address)).rejects.toThrow(
      'Expected test error'
    );
  });
});
