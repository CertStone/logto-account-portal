import {
  GET as identitiesGET,
  DELETE as identitiesDELETE,
} from "@/app/api/account/identities/route";

export const dynamic = "force-dynamic";

export async function GET() {
  return identitiesGET();
}

export async function DELETE(request: Request) {
  return identitiesDELETE(request);
}
