// Unit tests for bulk sample import — row-level error collection.
// Prisma is mocked so no DB required.

jest.mock('../utils/prisma', () => ({
  englishSample: { createMany: jest.fn() },
}));

const prisma = require('../utils/prisma');
const { bulkCreateSamples } = require('../controllers/sampleController');

function mockReq(body, contentType = 'application/json') {
  return {
    headers: { 'content-type': contentType },
    body,
  };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => jest.clearAllMocks());

describe('bulkCreateSamples — validation', () => {
  test('rejects empty array', async () => {
    const res = mockRes();
    await bulkCreateSamples(mockReq({ samples: [] }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejects when samples key is missing', async () => {
    const res = mockRes();
    await bulkCreateSamples(mockReq({}), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('imports valid rows and skips nothing when all rows are good', async () => {
    prisma.englishSample.createMany.mockResolvedValue({ count: 2 });
    const res = mockRes();
    await bulkCreateSamples(mockReq({
      samples: [
        { text: 'Wash your hands.', domain: 'health',   difficulty: 'easy'   },
        { text: 'Know your rights.', domain: 'legal',   difficulty: 'medium' },
      ],
    }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    const body = res.json.mock.calls[0][0];
    expect(body.created).toBe(2);
    expect(body.row_errors).toBeUndefined();
  });

  test('collects row errors and still imports valid rows', async () => {
    prisma.englishSample.createMany.mockResolvedValue({ count: 1 });
    const res = mockRes();
    await bulkCreateSamples(mockReq({
      samples: [
        { text: '',              domain: 'health',  difficulty: 'easy'   }, // missing text
        { text: 'Good sample.',  domain: 'invalid', difficulty: 'easy'   }, // bad domain
        { text: 'Valid sample.', domain: 'general', difficulty: 'medium' }, // OK
      ],
    }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    const body = res.json.mock.calls[0][0];
    expect(body.created).toBe(1);
    expect(body.invalid_rows).toBe(2);
    expect(body.row_errors).toHaveLength(2);
    expect(body.row_errors[0].row).toBe(1);
    expect(body.row_errors[1].row).toBe(2);
  });

  test('returns 400 when ALL rows are invalid', async () => {
    const res = mockRes();
    await bulkCreateSamples(mockReq({
      samples: [
        { text: '', domain: 'health' },
        { text: 'x', domain: 'bogus' },
      ],
    }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.row_errors).toHaveLength(2);
    expect(prisma.englishSample.createMany).not.toHaveBeenCalled();
  });

  test('defaults difficulty to medium when value is unrecognised', async () => {
    prisma.englishSample.createMany.mockResolvedValue({ count: 1 });
    const res = mockRes();
    await bulkCreateSamples(mockReq({
      samples: [{ text: 'Some text.', domain: 'general', difficulty: 'banana' }],
    }), res, jest.fn());

    const callArg = prisma.englishSample.createMany.mock.calls[0][0];
    expect(callArg.data[0].difficulty).toBe('medium');
  });
});
