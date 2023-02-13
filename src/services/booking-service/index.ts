import bookingRepository from "@/repositories/booking-repository";
import roomRepository from "@/repositories/room-repository";
import enrollmentRepository from "@/repositories/enrollment-repository";
import ticketRepository from "@/repositories/ticket-repository";
import { notFoundError } from "@/errors";
import { cannotBookingError } from "@/errors/cannot-booking-error";

async function checksEnrollmentAndTicket(userId: number) {

  const enrollment = await enrollmentRepository.findWithAddressByUserId(userId);
  if (!enrollment) {
    throw cannotBookingError();
  }
 
  const ticket = await ticketRepository.findTicketByEnrollmentId(enrollment.id);

  if (!ticket || ticket.status === "RESERVED" || ticket.TicketType.isRemote || !ticket.TicketType.includesHotel) {
    throw cannotBookingError();
  }
}

async function getBookings(userId: number) {
  await checksEnrollmentAndTicket(userId);

  const booking = await bookingRepository.findByUserId(userId);

  if (!booking) {
    throw notFoundError();
  }

  return booking;
}

async function postBookings(userId: number, roomId: number) {
  await checksEnrollmentAndTicket(userId);

  const room = await roomRepository.findRoomById(roomId);
  const booking = await bookingRepository.findBookingById(roomId);

  if (!room) {
    throw notFoundError();
  }

  if (room.capacity <= booking.length) {
    throw cannotBookingError();
  }

  const bookings = await bookingRepository.createBooking({ roomId, userId });
  return bookings;
}

async function changeBooking(userId: number, roomId: number) {
  await checksEnrollmentAndTicket(userId);

  const room = await roomRepository.findRoomById(roomId);
  const booking = await bookingRepository.findBookingById(roomId);

  if (!room) {
    throw notFoundError();
  }

  if (room.capacity <= booking.length) {
    throw cannotBookingError();
  }

  const bookings = await bookingRepository.findByUserId(userId);

  if (!bookings || bookings.userId !== userId) {
    throw cannotBookingError();
  }

  const bookingUpdate = await bookingRepository.updateBooking({ id: bookings.id, roomId, userId });
  return bookingUpdate;
}

const bookingService = {
  getBookings,
  postBookings,
  changeBooking
};

export default bookingService;
