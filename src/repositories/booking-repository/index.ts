import { prisma } from "@/config";
import { Booking } from "@prisma/client";

type CreateParams = Omit<Booking, "id" | "createdAt" | "updatedAt">;
type UpdateParams = Omit<Booking, "createdAt" | "updatedAt">;

async function findBookingById(roomId: number) {
  return prisma.booking.findMany({
    where: {
      roomId,
    },
    include: {
      Room: true
    }
  });
}

async function createBooking({ userId, roomId }: CreateParams): Promise<Booking> {
  return prisma.booking.create({
    data: {
      userId,
      roomId
    }
  });
}

async function findByUserId(userId: number) {
  return prisma.booking.findFirst({
    where: {
      userId,
    },
    include: {
      Room: true
    }
  });
}

async function updateBooking({ userId, roomId, id }: UpdateParams) {
  return prisma.booking.upsert({
    where: {
      id,
    },
    create: {
      userId,
      roomId
    },
    update: {
      roomId
    }
  });
}

const bookingRepository = {
  findBookingById,
  createBooking,
  findByUserId,
  updateBooking
};

export default bookingRepository;