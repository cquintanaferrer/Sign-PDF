import { http, HttpResponse } from "msw";

import { admin } from "./data/auth";
import { dashboard } from "./data/dashboard";
import { certificates } from "./data/certificates";
import { pendingCSR } from "./data/csr";
import {
  bootstrapState,
  initializeCA,
} from "./data/bootstrap";
import { resetBootstrap } from "./data/bootstrap";
export const handlers = [

  http.post("http://localhost:3000/api/auth/login", async ({ request }) => {

    const body = await request.json() as {
      username: string;
      password: string;
    };

    if (
      body.username === admin.username &&
      body.password === admin.password
    ) {
      return HttpResponse.json({
        access_token: admin.token,
      });
    }

    return new HttpResponse(null, {
      status: 401,
    });
  }),

  http.get(
    "http://localhost:3000/api/auth/profile",
    () => HttpResponse.json(admin.profile)
  ),

  http.get(
    "http://localhost:3000/api/dashboard",
    () => HttpResponse.json(dashboard)
  ),

  http.get(
    "http://localhost:3000/api/certificates",
    () => HttpResponse.json(certificates)
  ),

  http.get(
    "http://localhost:3000/api/csr/pending",
    () => HttpResponse.json(pendingCSR)
  ),

  http.post(
  "http://localhost:3000/api/ca/bootstrap",
  () => {

    if (bootstrapState.initialized) {

      return HttpResponse.json(
        {
          message: "La CA ya fue inicializada.",
        },
        {
          status: 409,
        }
      );

    }

    return HttpResponse.json(
      initializeCA()
    );

  }
),

  http.get(
  "http://localhost:3000/api/ca/status",
  () => HttpResponse.json(bootstrapState)
),

http.post(
  "http://localhost:3000/api/dev/reset-bootstrap",
  () => {

    resetBootstrap();

    return HttpResponse.json({
      ok: true,
    });

  }
),

];