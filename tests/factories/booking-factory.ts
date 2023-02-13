import { prisma } from "@/config";
import { Booking } from "@prisma/client";

type CreateBookingParams = {
  roomId: number,
  userId: number,
}

export async function createBookingWithRoomId({userId, roomId}: CreateBookingParams) {
  return prisma.booking.create({
    data: {
      userId,
      roomId,
    }
  });
}