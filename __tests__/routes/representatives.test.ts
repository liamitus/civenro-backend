// __tests__/routes/representatives.test.ts

jest.mock('../../src/prismaClient', () => {
  const mockPrisma = {
    bill: {
      findUnique: jest.fn(),
    },
    representative: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    representativeVote: {
      findUnique: jest.fn(),
    },
  };
  return {
    __esModule: true,
    default: mockPrisma,
  };
});

jest.mock('../../src/utils/civicApi', () => ({
  getRepresentativesByAddress: jest.fn(),
}));

import request from 'supertest';
import prisma from '../../src/prismaClient';
import app from '../../src/index'; // Make sure `index.ts` exports the Express app
import { getRepresentativesByAddress } from '../../src/utils/civicApi';

const mockedGetRepresentativesByAddress =
  getRepresentativesByAddress as jest.Mock;

describe('POST /api/representatives/by-address', () => {
  const ENDPOINT = '/api/representatives/by-address';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if address or billId are missing', async () => {
    let res = await request(app).post(ENDPOINT).send({ billId: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Address and billId are required');

    res = await request(app).post(ENDPOINT).send({ address: 'Some Address' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Address and billId are required');
  });

  it('should return 404 if the bill is not found', async () => {
    // Mock the external API call
    mockedGetRepresentativesByAddress.mockResolvedValue({
      offices: [],
      officials: [],
    });

    // Mock Prisma `bill.findUnique` to return null
    (prisma.bill.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post(ENDPOINT)
      .send({ address: '1600 Pennsylvania Ave', billId: '999' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Bill not found');
    expect(prisma.bill.findUnique).toHaveBeenCalledWith({
      where: { id: 999 },
    });
  });

  it('should return representatives with their votes', async () => {
    const mockAddress = '1600 Pennsylvania Ave';
    const mockBillId = '123';

    const mockOfficials = [
      {
        name: 'John Doe',
        party: 'Independent',
        photoUrl: 'https://bioguide.congress.gov/D/D000624.jpg',
        bioguideId: 'D000624',
        chamber: 'senator',
      },
      {
        name: 'Jane Smith',
        party: 'Democrat',
        photoUrl: 'https://bioguide.congress.gov/S/S000148.jpg',
        bioguideId: 'S000148',
        chamber: 'representative',
      },
    ];

    // Mock return from getRepresentativesByAddress
    mockedGetRepresentativesByAddress.mockResolvedValue({
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
      officials: mockOfficials,
    });

    // Mock bill found
    (prisma.bill.findUnique as jest.Mock).mockResolvedValue({
      id: 123,
      billType: 'senate_bill',
      currentStatus: 'passed_house',
    });

    // This means relevantChambers = ['senator'] (from billType) and we add 'senator' again if necessary
    // actually `passed_house` means we add 'senator', but the billType is 'senate_bill' so we start with 'senator'
    // passed_house adds 'senator'. It's already there, so effectively it's still ['senator'].
    // In this scenario, a senator is relevant.

    // Mock representative in database
    (prisma.representative.findUnique as jest.Mock).mockImplementation(
      ({ where }) => {
        if (where.bioguideId === 'D000624') {
          return Promise.resolve({
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
            imageUrl: 'http://image.com/johndoe.jpg',
            link: 'http://johndoe.com',
            bioguideId: 'D000624',
          });
        }
        return Promise.resolve(null);
      }
    );

    // Mock representativeVote
    (prisma.representativeVote.findUnique as jest.Mock).mockResolvedValue({
      representativeId: 1,
      billId: 123,
      vote: 'Yea',
    });

    const res = await request(app)
      .post(ENDPOINT)
      .send({ address: mockAddress, billId: mockBillId });

    expect(res.status).toBe(200);
    expect(res.body.representatives).toBeDefined();
    expect(res.body.representatives.length).toBe(1); // Only senator should be included

    const rep = res.body.representatives[0];
    expect(rep.name).toBe('John Doe');
    expect(rep.vote).toBe('Yea');
    expect(rep.imageUrl).toBe('http://image.com/johndoe.jpg');
    expect(rep.link).toBe('http://johndoe.com');
  });

  it('should handle errors gracefully', async () => {
    // Force an error in getRepresentativesByAddress
    mockedGetRepresentativesByAddress.mockRejectedValue(new Error('API Error'));

    const res = await request(app)
      .post(ENDPOINT)
      .send({ address: '1600 Pennsylvania Ave', billId: '123' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});
