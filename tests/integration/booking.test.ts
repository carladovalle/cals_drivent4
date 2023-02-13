import app, { init } from "@/app";
import faker from "@faker-js/faker";
import { TicketStatus } from "@prisma/client";
import httpStatus from "http-status";
import * as jwt from "jsonwebtoken";
import supertest from "supertest";
import {
  createEnrollmentWithAddress,
  createUser,
  createTicket,
  createPayment,
  createTicketTypeWithHotel,
  createHotel,
  createRoomWithHotelId,
  createBookingWithRoomId
} from "../factories";
import { cleanDb, generateValidToken } from "../helpers";

beforeAll(async () => {
  await init();
});

beforeEach(async () => {
  await cleanDb();
});

const server = supertest(app);

describe("GET /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.get("/booking");

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 404 when user has no booking", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithHotel();
        const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const payment = await createPayment(ticket.id, ticketType.price);

        const createdHotel = await createHotel();
        const createdRoom = await createRoomWithHotelId(createdHotel.id); 
  
        const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);
  
        expect(response.status).toEqual(httpStatus.NOT_FOUND);
    });
    
    it("should respond with status 200 and a list of bookings", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithHotel();
        const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const payment = await createPayment(ticket.id, ticketType.price);
  
        const createdHotel = await createHotel();
        const createdRoom = await createRoomWithHotelId(createdHotel.id); 
        const createdBooking = await createBookingWithRoomId({
            userId: user.id,
            roomId: createdRoom.id,
        });
  
        const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);
  
        expect(response.status).toEqual(httpStatus.OK);
  
        expect(response.body).toEqual(
          {
            id: createdBooking.id,
            room: {
                id: expect.any(Number),
                name: expect.any(String),
                capacity: expect.any(Number),
                hotelId: expect.any(Number),
                createdAt: expect.any(String),
                updatedAt: expect.any(String)
            }
          }
        );
    });
  });
});

function createValidBody() {
  return {
    "roomId": 1
  };
}

describe("POST /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const validBody = createValidBody();
    const response = await server.post("/booking").send(validBody);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();
    const validBody = createValidBody();
    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(validBody);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);
    const validBody = createValidBody();
    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(validBody);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });
  
    describe("when token is valid", () => {
      it("should respond with status 404 when room id doesn't exist", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithHotel();
        const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const payment = await createPayment(ticket.id, ticketType.price);
  
        const createdHotel = await createHotel();
        const createdRoom = await createRoomWithHotelId(createdHotel.id);
        const validBody = createValidBody();

        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({
          roomId: createdRoom.id + 1,
        });
  
        expect(response.status).toEqual(httpStatus.NOT_FOUND);
      });

      it("should respond with status 400 with a invalid body", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithHotel();
        const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const payment = await createPayment(ticket.id, ticketType.price);
  
        const createdHotel = await createHotel();
        const createdRoom = await createRoomWithHotelId(createdHotel.id);
  
        const validBody = createValidBody();
        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({
          roomId: 0,
        });
  
        expect(response.status).toEqual(httpStatus.BAD_REQUEST);
      });

      it("should respond with status 403 if user has not enrollment", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const ticketType = await createTicketTypeWithHotel();
  
        const createdHotel = await createHotel();
        const createdRoom = await createRoomWithHotelId(createdHotel.id);
  
        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({
          roomId: createdRoom.id,
        });
  
        expect(response.status).toEqual(httpStatus.FORBIDDEN);
      });
  
      it("should respond with status 403 if user has not paymented ticket", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithHotel();
        const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);
  
        const createdHotel = await createHotel();
        const createdRoom = await createRoomWithHotelId(createdHotel.id);
  
        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({
          roomId: createdRoom.id,
        });
  
        expect(response.status).toEqual(httpStatus.FORBIDDEN);
      });

      it("should respond with status 200 with a valid body", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithHotel();
        const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const payment = await createPayment(ticket.id, ticketType.price);
  
        const createdHotel = await createHotel();
        const createdRoom = await createRoomWithHotelId(createdHotel.id);
        const validBody = createValidBody();

        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({
          roomId: createdRoom.id,
        });
  
        expect(response.status).toEqual(httpStatus.CREATED);
      });
  
  });
});

describe("PUT /booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const validBody = createValidBody();
    const response = await server.put("/booking/1").send(validBody);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();
    const validBody = createValidBody();
    const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`).send(validBody);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);
    const validBody = createValidBody();
    const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`).send(validBody);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 403 when booking id doesn't exist", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);

      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const validBody = createValidBody();

      const twoUser = await createUser();
      const twoUserBooking = await createBookingWithRoomId({
        userId: twoUser.id,
        roomId: createdRoom.id,
      });

      const response = await server.put(`/booking/${twoUserBooking.id}`).set("Authorization", `Bearer ${token}`).send({
        roomId: createdRoom.id,
      });

      expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 404 when room id doesn't exist", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);

      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const validBody = createValidBody();

      const booking = await createBookingWithRoomId({
        roomId: createdRoom.id,
        userId: user.id,
      });

      const response = await server.put(`/booking/${booking.id}`).set("Authorization", `Bearer ${token}`).send({
        roomId: createdRoom.id + 1,
      });

      expect(response.status).toEqual(httpStatus.NOT_FOUND);
    });

    it("should respond with status 400 with a invalid body", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);

      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const validBody = createValidBody();

      const response = await server.put(`/booking/1`).set("Authorization", `Bearer ${token}`).send({
        roomId: 0,
      });

      expect(response.status).toEqual(httpStatus.BAD_REQUEST);
    });

    it("should respond with status 200 with a valid body", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);

      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const validBody = createValidBody();

      const booking = await createBookingWithRoomId({
        roomId: createdRoom.id,
        userId: user.id,
      });

      const twoRoom = await createRoomWithHotelId(createdHotel.id);

      const response = await server.put(`/booking/${booking.id}`).set("Authorization", `Bearer ${token}`).send({
        roomId: twoRoom.id,
      });

      expect(response.status).toEqual(httpStatus.OK);
    });

}); 
});