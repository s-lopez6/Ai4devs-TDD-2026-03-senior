import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { addCandidate } from '../application/services/candidateService';
import { addCandidateController } from '../presentation/controllers/candidateController';
import { Prisma } from '@prisma/client';
import { Candidate } from '../domain/models/Candidate';

// candidateController.test.ts

jest.mock('../../application/services/candidateService', () => ({
  addCandidate: jest.fn(),
}));

const mockedAddCandidate = addCandidate as jest.MockedFunction<
  typeof addCandidate
>;

const createResponseMock = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('addCandidateController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('addCandidateController_validInput_returns201AndCreatedCandidate', async () => {
    // Arrange
    const candidateData = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
    };
    const createdCandidate = { id: 1, ...candidateData };
    mockedAddCandidate.mockResolvedValue(createdCandidate as any);

    const req = { body: candidateData };
    const res = createResponseMock();

    // Act
    await addCandidateController(req as any, res as any);

    // Assert
    expect(mockedAddCandidate).toHaveBeenCalledWith(candidateData);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Candidate added successfully',
      data: createdCandidate,
    });
  });

  test('addCandidateController_serviceThrowsError_returns400WithErrorMessage', async () => {
    // Arrange
    const candidateData = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'invalid-email',
    };
    mockedAddCandidate.mockRejectedValue(new Error('Invalid email'));

    const req = { body: candidateData };
    const res = createResponseMock();

    // Act
    await addCandidateController(req as any, res as any);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Error adding candidate',
      error: 'Invalid email',
    });
  });

  test('addCandidateController_serviceThrowsNonError_returns400WithUnknownError', async () => {
    // Arrange
    mockedAddCandidate.mockRejectedValue('boom');

    const req = { body: {} };
    const res = createResponseMock();

    // Act
    await addCandidateController(req as any, res as any);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Error adding candidate',
      error: 'Unknown error',
    });
  });
});

// candidateService.ts
jest.mock('../../domain/models/Candidate', () => ({
  Candidate: jest.fn().mockImplementation(() => ({
    save: jest.fn(),
    education: [],
    workExperience: [],
    resumes: [],
  })),
}));

jest.mock('../../domain/models/Education', () => ({
  Education: jest.fn().mockImplementation(() => ({
    save: jest.fn(),
  })),
}));

jest.mock('../../domain/models/WorkExperience', () => ({
  WorkExperience: jest.fn().mockImplementation(() => ({
    save: jest.fn(),
  })),
}));

jest.mock('../../domain/models/Resume', () => ({
  Resume: jest.fn().mockImplementation(() => ({
    save: jest.fn(),
  })),
}));

describe('addCandidate input validation', () => {
  test('addCandidate_missingFirstName_throwsValidationError', async () => {
    // Arrange
    const invalidInput = {
      lastName: 'Lovelace',
      email: 'ada@example.com',
    };

    // Act + Assert
    await expect(addCandidate(invalidInput)).rejects.toThrow('Invalid name');
  });

  test('addCandidate_invalidEmail_throwsValidationError', async () => {
    // Arrange
    const invalidInput = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'invalid-email',
    };

    // Act + Assert
    await expect(addCandidate(invalidInput)).rejects.toThrow('Invalid email');
  });

  test('addCandidate_invalidPhone_throwsValidationError', async () => {
    // Arrange
    const invalidInput = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phone: '123456789',
    };

    // Act + Assert
    await expect(addCandidate(invalidInput)).rejects.toThrow('Invalid phone');
  });

  test('addCandidate_invalidCvShape_throwsValidationError', async () => {
    // Arrange
    const invalidInput = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      cv: {
        filePath: 10,
        fileType: 'pdf',
      },
    };

    // Act + Assert
    await expect(addCandidate(invalidInput)).rejects.toThrow('Invalid CV data');
  });
});

// Candidate.ts
const createMock = jest.fn();
const updateMock = jest.fn();
const findUniqueMock = jest.fn();

class PrismaClientInitializationError extends Error {}

jest.mock(
  '@prisma/client',
  () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
      candidate: {
        create: createMock,
        update: updateMock,
        findUnique: findUniqueMock,
      },
    })),
    Prisma: {
      PrismaClientInitializationError,
    },
  }),
  { virtual: true },
);

const createPrismaInitErrorFixture = (message: string) => {
  const error = Object.create(
    (Prisma as any).PrismaClientInitializationError.prototype,
  );
  error.message = message;
  return error;
};

describe('Candidate persistence behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('candidateSave_withoutId_callsCreateWithMappedData', async () => {
    // Arrange
    const input = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      address: 'London',
      education: [
        {
          institution: 'University of London',
          title: 'Math',
          startDate: new Date('1831-01-01'),
          endDate: new Date('1835-01-01'),
        },
      ],
      workExperience: [
        {
          company: 'Analytical Engine Lab',
          position: 'Researcher',
          description: 'Algorithms',
          startDate: new Date('1835-01-01'),
          endDate: new Date('1842-01-01'),
        },
      ],
      resumes: [
        {
          filePath: '/files/ada.pdf',
          fileType: 'application/pdf',
        },
      ],
    };
    const created = { id: 10, ...input };
    createMock.mockResolvedValue(created);
    const candidate = new Candidate(input);

    // Act
    const result = await candidate.save();

    // Assert
    expect(createMock).toHaveBeenCalledWith({
      data: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        address: 'London',
        educations: {
          create: [
            {
              institution: 'University of London',
              title: 'Math',
              startDate: new Date('1831-01-01'),
              endDate: new Date('1835-01-01'),
            },
          ],
        },
        workExperiences: {
          create: [
            {
              company: 'Analytical Engine Lab',
              position: 'Researcher',
              description: 'Algorithms',
              startDate: new Date('1835-01-01'),
              endDate: new Date('1842-01-01'),
            },
          ],
        },
        resumes: {
          create: [
            {
              filePath: '/files/ada.pdf',
              fileType: 'application/pdf',
            },
          ],
        },
      },
    });
    expect(result).toBe(created);
  });

  test('candidateSave_withId_callsUpdateWithWhereAndData', async () => {
    // Arrange
    const input = {
      id: 7,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
    };
    const updated = { ...input, phone: '612345678' };
    updateMock.mockResolvedValue(updated);
    const candidate = new Candidate(input);

    // Act
    const result = await candidate.save();

    // Assert
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
      },
    });
    expect(result).toBe(updated);
  });

  test('candidateSave_createPrismaInitializationError_throwsFriendlyMessage', async () => {
    // Arrange
    const candidate = new Candidate({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
    });
    createMock.mockRejectedValue(createPrismaInitErrorFixture('db down'));

    // Act + Assert
    await expect(candidate.save()).rejects.toThrow(
      'No se pudo conectar con la base de datos. Por favor, asegúrese de que el servidor de base de datos esté en ejecución.',
    );
  });

  test('candidateSave_updatePrismaInitializationError_throwsFriendlyMessage', async () => {
    // Arrange
    const candidate = new Candidate({
      id: 1,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
    });
    updateMock.mockRejectedValue(createPrismaInitErrorFixture('db down'));

    // Act + Assert
    await expect(candidate.save()).rejects.toThrow(
      'No se pudo conectar con la base de datos. Por favor, asegúrese de que el servidor de base de datos esté en ejecución.',
    );
  });

  test('candidateSave_updateRecordNotFound_throwsFriendlyMessage', async () => {
    // Arrange
    const candidate = new Candidate({
      id: 404,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
    });
    updateMock.mockRejectedValue({ code: 'P2025' });

    // Act + Assert
    await expect(candidate.save()).rejects.toThrow(
      'No se pudo encontrar el registro del candidato con el ID proporcionado.',
    );
  });

  test('candidateSave_unknownCreateError_rethrowsOriginalError', async () => {
    // Arrange
    const candidate = new Candidate({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
    });
    const unknownError = new Error('unexpected create failure');
    createMock.mockRejectedValue(unknownError);

    // Act + Assert
    await expect(candidate.save()).rejects.toBe(unknownError);
  });

  test('candidateFindOne_whenRecordDoesNotExist_returnsNull', async () => {
    // Arrange
    findUniqueMock.mockResolvedValue(null);

    // Act
    const result = await Candidate.findOne(99);

    // Assert
    expect(findUniqueMock).toHaveBeenCalledWith({ where: { id: 99 } });
    expect(result).toBeNull();
  });

  test('candidateFindOne_whenRecordExists_returnsCandidateInstance', async () => {
    // Arrange
    const dbRecord = {
      id: 11,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phone: '612345678',
      address: 'London',
    };
    findUniqueMock.mockResolvedValue(dbRecord);

    // Act
    const result = await Candidate.findOne(11);

    // Assert
    expect(result).toBeInstanceOf(Candidate);
    expect(result).toMatchObject(dbRecord);
  });
});
