import json
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC_PATH = ROOT / "docs-json.json"
OUT_PATH = ROOT / "docs" / "aurora-api-qa.md"
GENERATED_DATE = "2026-07-19"

HTTP_METHODS = {"get", "post", "put", "patch", "delete", "head", "options", "trace"}

MODULE_CODES = {
    "Authentication": "AUTH",
    "Activity Logs": "ACT",
    "Projects": "PROJ",
    "Notifications": "NOTI",
    "Checklists": "CHK",
    "Tasks": "TASK",
    "Task Comments": "COMM",
    "Task Attachments": "ATT",
    "Tags": "TAG",
}

MODULE_DESCRIPTIONS = {
    "Authentication": "Dang ky tai khoan, xac thuc email bang OTP, dang nhap, refresh/logout token va reset password.",
    "Activity Logs": "Truy van lich su hoat dong cua user, project va task de phuc vu audit trail.",
    "Projects": "Quan ly vong doi project, thanh vien, loi moi, role va hanh dong roi/xoa project.",
    "Notifications": "Quan ly notification cua user hien tai, trang thai da doc/chua doc va unread count.",
    "Checklists": "Quan ly checklist trong project, chi tiet checklist, soft delete va chuyen trang thai.",
    "Tasks": "Quan ly task trong checklist, gan nguoi phu trach, chuyen trang thai, sap xep va dashboard summary.",
    "Task Comments": "Binh luan tren task, cap nhat/xoa comment va xu ly mention.",
    "Task Attachments": "Upload, liet ke, download URL va soft delete file dinh kem cua task.",
    "Tags": "Quan ly tag theo project va gan/go tag tren task.",
}

SCENARIOS = {
    "Authentication": [
        ("SC-AUTH-001", "Account onboarding", "Dang ky user moi, verify email bang OTP, login thanh cong va nhan access/refresh token.", "/auth/register, /auth/verify-email, /auth/login", "P0"),
        ("SC-AUTH-002", "OTP lifecycle", "Resend OTP, verify OTP sai/het han, verify OTP dung va chan verify lai token da dung.", "/auth/verify-email, /auth/resend-otp", "P1"),
        ("SC-AUTH-003", "Session lifecycle", "Refresh access token bang refresh token hop le, logout va dam bao refresh token bi vo hieu hoa.", "/auth/refresh, /auth/logout", "P0"),
        ("SC-AUTH-004", "Password recovery", "Forgot password, verify reset OTP, reset password, login bang password moi va reject password cu.", "/auth/forgot-password, /auth/verify-reset-otp, /auth/reset-password", "P0"),
        ("SC-AUTH-005", "Abuse prevention", "Thu brute force login/OTP va resend qua nguong de xac minh rate limit/lockout/logging.", "Auth endpoints", "P1"),
    ],
    "Projects": [
        ("SC-PROJ-001", "Project lifecycle", "Tao project, xem danh sach/chi tiet, update, complete/archive va soft delete theo dung trang thai.", "Projects CRUD/status APIs", "P0"),
        ("SC-PROJ-002", "Project membership", "Invite member, accept invitation, xem member list/detail va cap nhat role.", "Invitation/member APIs", "P0"),
        ("SC-PROJ-003", "Project authorization", "Kiem tra manager/admin/super admin/member/non-member tren cac API doc, update, xoa va role.", "Projects protected APIs", "P0"),
        ("SC-PROJ-004", "Member constraints", "Khong cho remove owner/self, khong cho remove member co active task, khong cho last manager leave.", "Member remove/leave APIs", "P0"),
        ("SC-PROJ-005", "Invitation integrity", "Token loi moi het han, email khong khop, user da la member va duplicate invitation.", "Invite/accept APIs", "P1"),
    ],
    "Checklists": [
        ("SC-CHK-001", "Checklist lifecycle", "Tao checklist trong project, lay danh sach, lay chi tiet, update va soft delete.", "Checklist APIs", "P0"),
        ("SC-CHK-002", "Checklist status flow", "Chuyen status OPEN -> IN_PROGRESS -> DONE va reject transition nguoc/bo qua buoc neu khong hop le.", "/checklists/{checklistId}/status", "P0"),
        ("SC-CHK-003", "Deletion rules", "Khong cho xoa checklist con incomplete task; cho xoa khi tat ca task da hoan thanh.", "DELETE /checklists/{checklistId}", "P0"),
        ("SC-CHK-004", "Checklist access control", "Member xem, manager/creator update/delete, non-member bi chan.", "Checklist APIs", "P0"),
    ],
    "Tasks": [
        ("SC-TASK-001", "Task lifecycle", "Tao task, xem danh sach/chi tiet, update, assign, chuyen status, reorder va soft delete.", "Task APIs", "P0"),
        ("SC-TASK-002", "Assignment rules", "Chi assign task cho member thuoc project; reject assignee khong ton tai/khong thuoc project.", "/tasks/{taskId}/assign", "P0"),
        ("SC-TASK-003", "Status and summary", "Chuyen status task va xac minh checklist status/task-summary duoc cap nhat dung.", "/tasks/{taskId}/status, /projects/{projectId}/task-summary", "P0"),
        ("SC-TASK-004", "Ordering", "Reorder task voi index 0-based, boundary dau/cuoi va atomicity khi position loi.", "/tasks/reorder", "P1"),
        ("SC-TASK-005", "Task authorization", "Manager/assignee/creator/member co dung quyen cho update/delete/view.", "Task protected APIs", "P0"),
    ],
    "Task Comments": [
        ("SC-COMM-001", "Comment lifecycle", "Them comment, xem danh sach oldest first, update boi owner va soft delete.", "Comment APIs", "P0"),
        ("SC-COMM-002", "Mention behavior", "Comment co @username tao notification dung nguoi va khong tao mention gia.", "POST /tasks/{taskId}/comments", "P1"),
        ("SC-COMM-003", "Comment authorization", "Chi owner update; owner hoac project manager delete; non-member bi chan.", "Comment APIs", "P0"),
        ("SC-COMM-004", "Content safety", "Kiem tra max length, empty content, script tag va HTML rendering an toan.", "Comment APIs", "P1"),
    ],
    "Task Attachments": [
        ("SC-ATT-001", "Attachment lifecycle", "Upload file <=20MB, list attachments, lay download URL va soft delete.", "Attachment APIs", "P0"),
        ("SC-ATT-002", "File validation", "Reject file rong, file qua 20MB, MIME khong hop le va filename nguy hiem.", "POST /tasks/{taskId}/attachments", "P0"),
        ("SC-ATT-003", "Attachment authorization", "Member project xem/download; owner/manager/admin xoa; non-member bi chan.", "Attachment APIs", "P0"),
        ("SC-ATT-004", "Storage integrity", "URL download khong bi leak, file da xoa khong con download duoc.", "Download/delete APIs", "P1"),
    ],
    "Tags": [
        ("SC-TAG-001", "Tag lifecycle", "Tao tag, lay danh sach, update va hard delete tag kem association.", "Tag CRUD APIs", "P0"),
        ("SC-TAG-002", "Tag assignment", "Gan tag vao task, lay tag cua task, go tag va reject duplicate assignment.", "Task tag APIs", "P0"),
        ("SC-TAG-003", "Tag uniqueness", "Khong cho trung ten tag trong cung project; cho cung ten o project khac neu business cho phep.", "Create/update tag APIs", "P1"),
        ("SC-TAG-004", "Tag authorization", "Manager/admin/super admin quan ly tag; member chi xem/gan/go theo quyen project.", "Tag APIs", "P0"),
        ("SC-TAG-005", "Color validation", "Kiem tra HEX color hop le, invalid HEX va CSS injection payload.", "Create/update tag APIs", "P1"),
    ],
    "Notifications": [
        ("SC-NOTI-001", "Notification inbox", "Lay danh sach notification cua current user voi pagination va filter isRead.", "GET /notifications", "P0"),
        ("SC-NOTI-002", "Read state", "Mark one notification read, mark all read va verify unread count.", "Notification read APIs", "P0"),
        ("SC-NOTI-003", "Notification ownership", "User khong the doc/xoa notification cua user khac.", "Notification protected APIs", "P0"),
        ("SC-NOTI-004", "Deletion behavior", "Xoa notification va dam bao khong xuat hien lai trong list/unread count.", "DELETE /notifications/{notificationId}", "P1"),
    ],
    "Activity Logs": [
        ("SC-ACT-001", "My activity feed", "Current user xem lich su cua minh voi pagination va sort on dinh.", "GET /activities/me", "P1"),
        ("SC-ACT-002", "Project activity feed", "Member project xem activity project; non-member bi 403.", "GET /projects/{projectId}/activities", "P1"),
        ("SC-ACT-003", "Task activity feed", "Member project xem activity cua task; task khong ton tai tra 404.", "GET /tasks/{taskId}/activities", "P1"),
        ("SC-ACT-004", "Audit integrity", "Cac hanh dong create/update/delete/status/role tao log dung actor, target va timestamp.", "Activity sources", "P1"),
    ],
}

BUSINESS_RULES = {
    ("POST", "/auth/register"): "Dang ky email moi thanh cong; dang ky lai email da ton tai phai tra 409 va khong tao duplicate user.",
    ("POST", "/auth/verify-email"): "OTP dung xac thuc email thanh cong; OTP sai/het han/da dung phai tra 400.",
    ("POST", "/auth/resend-otp"): "Resend OTP cho email hop le; vuot nguong resend phai tra 429 va khong spam email.",
    ("POST", "/auth/login"): "Chi user da verify email va dung password moi nhan token; credential sai hoac email chua verify tra 401.",
    ("POST", "/auth/refresh"): "Refresh token hop le tao access token moi; token het han/bi revoke/sai tra 401.",
    ("POST", "/auth/logout"): "Logout vo hieu hoa refresh token/session; refresh lai sau logout phai that bai 401.",
    ("POST", "/auth/forgot-password"): "Tra response generic 200 cho ca email ton tai/khong ton tai de tranh user enumeration.",
    ("POST", "/auth/verify-reset-otp"): "Reset OTP dung mo khoa buoc reset password; OTP sai/het han tra 400.",
    ("POST", "/auth/reset-password"): "Chi reset sau khi OTP da verify; password cu khong login duoc, password moi login duoc.",
    ("GET", "/activities/me"): "Chi tra activity cua user hien tai, pagination dung va khong leak activity user khac.",
    ("GET", "/projects/{projectId}/activities"): "Member project xem duoc activity project; non-member bi 403.",
    ("GET", "/tasks/{taskId}/activities"): "Member project xem activity task; task khong ton tai tra 404.",
    ("POST", "/projects"): "Tao project voi owner/manager dung; endDate truoc startDate phai tra 400.",
    ("GET", "/projects"): "Danh sach chi gom project user so huu hoac duoc share; project soft-deleted khong leak neu business yeu cau.",
    ("GET", "/projects/{projectId}"): "Member/admin/super admin xem duoc; non-member bi 403, project khong ton tai 404.",
    ("PUT", "/projects/{projectId}"): "Manager/admin/super admin update duoc; project deleted hoac date khong hop le tra 400.",
    ("DELETE", "/projects/{projectId}"): "Soft delete project va chan cac thao tac tiep theo tren project da xoa.",
    ("PATCH", "/projects/{projectId}/archive"): "Chi manager archive project active; archive lai project khong active tra 409.",
    ("PATCH", "/projects/{projectId}/complete"): "Chi manager complete project active; complete lai project khong active tra 409.",
    ("POST", "/projects/{projectId}/invite"): "Manager invite user hop le; user da la member tra 409, input/role loi tra 400.",
    ("POST", "/projects/invitations/accept"): "Accept token hop le va email khop; token het han 400, email khong khop 403, da la member 409.",
    ("GET", "/projects/{projectId}/members"): "Member project xem danh sach member; non-member bi 403, project missing 404.",
    ("GET", "/projects/{projectId}/members/{memberId}"): "Tra detail member trong project; member/project missing tra 404.",
    ("DELETE", "/projects/{projectId}/members/{memberId}"): "Khong cho remove owner/self; member co active tasks tra 409.",
    ("PATCH", "/projects/{projectId}/members/{memberId}/role"): "Chi manager doi role; khong doi owner, role invalid tra 400.",
    ("POST", "/projects/{projectId}/leave"): "User roi project thanh cong; last manager hoac user co active tasks bi chan 400.",
    ("GET", "/notifications"): "Tra notification cua current user, filter isRead va pagination dung.",
    ("GET", "/notifications/unread-count"): "Unread count phan anh dung sau khi mark read/delete.",
    ("PATCH", "/notifications/{notificationId}/read"): "Chi owner notification mark read duoc; not found 404, not owner 403.",
    ("PATCH", "/notifications/read-all"): "Chi mark notification cua current user, khong anh huong user khac.",
    ("DELETE", "/notifications/{notificationId}"): "Chi owner xoa duoc notification; xoa xong khong con trong list.",
    ("POST", "/projects/{projectId}/checklists"): "Member project tao checklist hop le; project missing/deleted hoac input loi bi reject.",
    ("GET", "/projects/{projectId}/checklists"): "Member xem checklist cua project; non-member bi 403.",
    ("GET", "/checklists/{checklistId}"): "Tra chi tiet checklist kem task counts dung; checklist missing 404.",
    ("PUT", "/checklists/{checklistId}"): "Manager hoac creator update duoc; checklist deleted tra 400.",
    ("DELETE", "/checklists/{checklistId}"): "Chi xoa checklist khi khong con incomplete task; neu con incomplete task tra 409.",
    ("PATCH", "/checklists/{checklistId}/status"): "Chi cho transition OPEN -> IN_PROGRESS -> DONE; transition khong hop le tra 400.",
    ("POST", "/checklists/{checklistId}/tasks"): "Tao task trong checklist hop le; assignee phai la project member neu truyen.",
    ("GET", "/checklists/{checklistId}/tasks"): "Tra task cua checklist dung thu tu, khong leak task da xoa neu soft delete.",
    ("GET", "/tasks/{taskId}"): "Tra detail task kem assignee/status/tags/counts dung.",
    ("PUT", "/tasks/{taskId}"): "Manager hoac assignee update duoc; task deleted hoac input loi tra 400.",
    ("DELETE", "/tasks/{taskId}"): "Manager hoac creator soft delete task; task khong ton tai tra 404.",
    ("PATCH", "/tasks/{taskId}/assign"): "Chi assign cho project member; assignee invalid tra 400.",
    ("PATCH", "/tasks/{taskId}/status"): "StatusId hop le 1..4; cap nhat task va auto-update checklist status dung.",
    ("PATCH", "/tasks/reorder"): "newPosition 0-based hop le reorder atomic; position loi tra 400 va khong doi order.",
    ("GET", "/projects/{projectId}/task-summary"): "Task summary theo project dung voi so luong task tung status.",
    ("POST", "/tasks/{taskId}/comments"): "Member project comment duoc; @username mention tao notification dung nguoi neu user hop le.",
    ("GET", "/tasks/{taskId}/comments"): "Tra comment oldest first; task missing 404.",
    ("PUT", "/comments/{commentId}"): "Chi owner update; comment da xoa khong update duoc va tra 400.",
    ("DELETE", "/comments/{commentId}"): "Owner hoac project manager soft delete duoc; non-owner/non-manager bi 403.",
    ("POST", "/tasks/{taskId}/attachments"): "Upload file hop le <=20MB len storage; task deleted/file invalid tra 400.",
    ("GET", "/tasks/{taskId}/attachments"): "Member project xem list attachment cua task; task missing 404.",
    ("GET", "/attachments/{attachmentId}/download"): "Authorized user nhan download URL; non-member bi 403, missing attachment 404.",
    ("DELETE", "/attachments/{attachmentId}"): "Owner/manager/admin soft delete duoc; file da xoa khong con download duoc.",
    ("POST", "/projects/{projectId}/tags"): "Tao tag voi ten duy nhat trong project va HEX color hop le; duplicate name tra 409.",
    ("GET", "/projects/{projectId}/tags"): "Member project xem tags cua project; non-member bi 403.",
    ("PUT", "/tags/{tagId}"): "Manager/admin/super admin update tag; duplicate name tra 409.",
    ("DELETE", "/tags/{tagId}"): "Hard delete tag va tat ca association voi task.",
    ("POST", "/tasks/{taskId}/tags"): "Gan tag thuoc cung project; duplicate assignment 409, tag sai project 400.",
    ("GET", "/tasks/{taskId}/tags"): "Tra dung tag dang gan cho task; task missing 404.",
    ("DELETE", "/tasks/{taskId}/tags/{tagId}"): "Go tag da gan thanh cong; tag chua gan tra 400.",
}

CATEGORIES = [
    ("HP", "Happy Path"),
    ("VAL", "Validation"),
    ("BND", "Boundary"),
    ("AUTHN", "Authentication"),
    ("AUTHZ", "Authorization"),
    ("BL", "Business Logic"),
    ("SEC", "Security"),
]


def load_spec():
    return json.loads(SPEC_PATH.read_text(encoding="utf-8"))


def md(value):
    if value is None:
        return ""
    text = str(value)
    return text.replace("|", "\\|").replace("\r\n", "\n").replace("\n", "<br>")


def code_block(language, content):
    if not content:
        content = ""
    return f"```{language}\n{content}\n```"


def ref_name(schema):
    if isinstance(schema, dict) and "$ref" in schema:
        return schema["$ref"].split("/")[-1]
    return None


class OpenApiDoc:
    def __init__(self, spec):
        self.spec = spec
        self.schemas = spec.get("components", {}).get("schemas", {})
        self.operations = self._collect_operations()
        self.by_module = defaultdict(list)
        for op in self.operations:
            self.by_module[op["tag"]].append(op)

    def _collect_operations(self):
        operations = []
        for path, methods in self.spec.get("paths", {}).items():
            for method, operation in methods.items():
                if method.lower() not in HTTP_METHODS:
                    continue
                tag = (operation.get("tags") or ["General"])[0]
                operations.append(
                    {
                        "method": method.upper(),
                        "path": path,
                        "tag": tag,
                        "operation": operation,
                        "summary": operation.get("summary") or operation.get("operationId") or "",
                    }
                )
        return operations

    def resolve_schema(self, schema):
        name = ref_name(schema)
        if name:
            return self.schemas.get(name, {}), name
        return schema or {}, None

    def schema_type(self, schema):
        schema, name = self.resolve_schema(schema)
        if name:
            return name
        if not schema:
            return "-"
        typ = schema.get("type")
        if "enum" in schema:
            values = ", ".join(str(x) for x in schema["enum"])
            return f"{typ or 'string'} enum({values})"
        if typ == "array":
            return f"array<{self.schema_type(schema.get('items', {}))}>"
        if schema.get("format"):
            return f"{typ}:{schema.get('format')}"
        if typ:
            return typ
        if schema.get("properties"):
            return "object"
        return "-"

    def request_bodies(self, op):
        body = op["operation"].get("requestBody")
        if not body:
            return []
        rows = []
        for content_type, content in body.get("content", {}).items():
            rows.append((content_type, content.get("schema", {}), bool(body.get("required"))))
        return rows

    def body_schema(self, op):
        bodies = self.request_bodies(op)
        if not bodies:
            return {}, None, None
        content_type, schema, _required = bodies[0]
        resolved, name = self.resolve_schema(schema)
        return resolved, name, content_type

    def body_required_fields(self, op):
        schema, _name, _content_type = self.body_schema(op)
        return list(schema.get("required", []))

    def body_properties(self, op):
        schema, _name, content_type = self.body_schema(op)
        if content_type == "multipart/form-data":
            return schema.get("properties", {})
        return schema.get("properties", {})

    def success_response(self, op):
        responses = op["operation"].get("responses", {})
        success = [code for code in responses.keys() if str(code).startswith("2")]
        if not success:
            return "-", "-"
        code = sorted(success)[0]
        return code, responses[code].get("description", "")

    def response_description(self, op, code):
        return op["operation"].get("responses", {}).get(str(code), {}).get("description", "")

    def has_response(self, op, code):
        return str(code) in op["operation"].get("responses", {})

    def requires_bearer(self, op):
        security = op["operation"].get("security", [])
        return any("bearer" in item for item in security if isinstance(item, dict))

    def parameters(self, op):
        return op["operation"].get("parameters", [])

    def operation_label(self, op):
        return f"{op['method']} {op['path']}"

    def sample_for_property(self, name, schema):
        if "example" in schema:
            return schema["example"]
        if "enum" in schema and schema["enum"]:
            return schema["enum"][0]
        lowered = name.lower()
        desc = (schema.get("description") or "").lower()
        typ = schema.get("type", "string")
        if "email" in lowered:
            return "qa.user@example.com"
        if "password" in lowered:
            return "Abc@1234"
        if "token" in lowered:
            return "valid-token"
        if lowered == "otp" or "6-digit otp" in desc:
            return "123456"
        if "date" in lowered:
            return "2026-08-31"
        if lowered in {"color"}:
            return "#2ecc71"
        if lowered.endswith("id") or typ == "number":
            return 1
        if typ == "boolean":
            return True
        if typ == "array":
            return []
        if "content" in lowered:
            return "Comment noi dung hop le"
        if "description" in lowered:
            return "Mo ta hop le"
        if "name" in lowered:
            return "QA Sample"
        if "title" in lowered:
            return "QA checklist item"
        return "string"

    def sample_from_schema(self, schema):
        schema, _name = self.resolve_schema(schema)
        if not schema:
            return {}
        if schema.get("type") == "object" or schema.get("properties"):
            return {
                name: self.sample_for_property(name, prop)
                for name, prop in schema.get("properties", {}).items()
            }
        return self.sample_for_property("value", schema)

    def constraints_for_property(self, name, schema, required):
        constraints = []
        if required:
            constraints.append("required")
        for key in ["minLength", "maxLength", "minimum", "maximum", "format", "pattern"]:
            if key in schema:
                constraints.append(f"{key}={schema[key]}")
        if "enum" in schema:
            constraints.append("enum=" + ", ".join(str(x) for x in schema["enum"]))
        desc = schema.get("description") or ""
        lowered = desc.lower()
        if "min 8" in lowered:
            constraints.append("min password length 8")
        if "uppercase" in lowered:
            constraints.append("requires uppercase")
        if "special" in lowered:
            constraints.append("requires special char")
        if "6-digit" in lowered:
            constraints.append("6 digits")
        if "max 20mb" in lowered:
            constraints.append("max file size 20MB")
        return ", ".join(constraints) if constraints else "-"

    def schema_table(self, schema):
        schema, name = self.resolve_schema(schema)
        if not schema:
            return "_Khong co schema._"
        required = set(schema.get("required", []))
        props = schema.get("properties", {})
        if not props:
            return f"`{name or self.schema_type(schema)}`"
        lines = [
            "| Field | Required | Type | Constraints | Example | Description |",
            "|---|---:|---|---|---|---|",
        ]
        for prop_name, prop in props.items():
            example = prop.get("example", self.sample_for_property(prop_name, prop))
            lines.append(
                "| {field} | {req} | {typ} | {constraints} | {example} | {desc} |".format(
                    field=md(prop_name),
                    req="Yes" if prop_name in required else "No",
                    typ=md(self.schema_type(prop)),
                    constraints=md(self.constraints_for_property(prop_name, prop, prop_name in required)),
                    example=md(example),
                    desc=md(prop.get("description", "")),
                )
            )
        return "\n".join(lines)

    def sample_request(self, op):
        bodies = self.request_bodies(op)
        if not bodies:
            return "_Khong co request body._"
        content_type, schema, _required = bodies[0]
        if content_type == "multipart/form-data":
            return code_block("text", "file=@sample.pdf  # binary, max 20MB")
        sample = self.sample_from_schema(schema)
        return code_block("json", json.dumps(sample, ensure_ascii=False, indent=2))


def status_table(operation):
    responses = operation["operation"].get("responses", {})
    lines = ["| Status | Meaning |", "|---:|---|"]
    for code, response in responses.items():
        lines.append(f"| {md(code)} | {md(response.get('description', ''))} |")
    return "\n".join(lines)


def parameter_table(api, op):
    params = api.parameters(op)
    if not params:
        return "_Khong co parameter._"
    lines = ["| Name | In | Required | Type | Description |", "|---|---|---:|---|---|"]
    for param in params:
        schema = param.get("schema", {})
        lines.append(
            f"| {md(param.get('name'))} | {md(param.get('in'))} | {'Yes' if param.get('required') else 'No'} | {md(api.schema_type(schema))} | {md(param.get('description', ''))} |"
        )
    return "\n".join(lines)


def operation_notes(api, op):
    notes = []
    summary = op["summary"]
    responses = op["operation"].get("responses", {})
    if api.requires_bearer(op):
        notes.append("Can JWT bearer token hop le.")
    if "manager only" in summary.lower():
        notes.append("Quyen manager la dieu kien bat buoc.")
    if "admin" in summary.lower() or "super admin" in summary.lower():
        notes.append("Can phan biet role manager/admin/super admin/member.")
    if "soft delete" in summary.lower():
        notes.append("Day la soft delete; can verify ban ghi khong con hien trong luong chinh va audit log van giu duoc.")
    if "hard delete" in summary.lower():
        notes.append("Day la hard delete; can verify association lien quan bi xoa sach.")
    if "pagination" in summary.lower() or any(param.get("name") in {"page", "limit"} for param in api.parameters(op)):
        notes.append("Can test page/limit voi gia tri mac dinh, nho nhat, am va qua lon.")
    for code in ["400", "401", "403", "404", "409", "429"]:
        if code in responses:
            notes.append(f"{code}: {responses[code].get('description', '')}")
    return notes or ["Khong co business note dac biet trong OpenAPI."]


def valid_precondition(api, op):
    if api.requires_bearer(op):
        return "Da co JWT hop le va user co dung quyen voi resource."
    return "Khong can JWT; du lieu test hop le da san sang."


def valid_request_desc(api, op):
    parts = []
    params = api.parameters(op)
    if params:
        names = [p["name"] for p in params]
        parts.append("path/query hop le: " + ", ".join(names))
    required = api.body_required_fields(op)
    if required:
        parts.append("body co field bat buoc: " + ", ".join(required))
    bodies = api.request_bodies(op)
    if bodies and bodies[0][0] == "multipart/form-data":
        parts.append("multipart file hop le <=20MB")
    if not parts:
        parts.append("request hop le theo route")
    return "; ".join(parts)


def expected_validation(api, op):
    if api.has_response(op, 400):
        return "400 - " + api.response_description(op, 400)
    return "400 Bad Request theo validation policy; response khong lam thay doi du lieu."


def expected_boundary(api, op):
    codes = []
    for code in ["404", "409"]:
        if api.has_response(op, code):
            codes.append(f"{code} {api.response_description(op, code)}")
    if api.has_response(op, 400):
        return "Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 - " + api.response_description(op, 400) + ("; domain boundary co the tra " + "; ".join(codes) + "." if codes else ".")
    if codes:
        return "Gia tri trong bien duoc chap nhan; data-shape ngoai bien tra 400 Bad Request; domain boundary co the tra " + "; ".join(codes) + "."
    return "Gia tri trong bien duoc chap nhan; ngoai bien tra 400/404 phu hop va khong mutate data."


def validation_steps(api, op):
    items = []
    required = api.body_required_fields(op)
    if required:
        items.append("lan luot bo required field: " + ", ".join(required))
    props = api.body_properties(op)
    numeric_fields = [name for name, schema in props.items() if schema.get("type") == "number" or name.lower().endswith("id")]
    if numeric_fields:
        items.append("gui sai type cho numeric field: " + ", ".join(numeric_fields))
    params = api.parameters(op)
    numeric_params = [p["name"] for p in params if p.get("schema", {}).get("type") == "number"]
    if numeric_params:
        items.append("path/query numeric khong hop le: " + ", ".join(numeric_params) + "='abc'")
    if any(p.get("in") == "query" for p in params):
        items.append("query page/limit la chuoi, so am hoac 0")
    if not items:
        items.append("gui malformed JSON hoac content-type sai neu endpoint co body")
    return "; ".join(items)


def boundary_steps(api, op):
    props = api.body_properties(op)
    params = api.parameters(op)
    items = []
    for name, schema in props.items():
        desc = (schema.get("description") or "").lower()
        lowered = name.lower()
        if "maxLength" in schema:
            items.append(f"{name}: length={schema['maxLength']} va {schema['maxLength'] + 1}")
        if "min 8" in desc or "password" in lowered:
            items.append(f"{name}: 7/8 ky tu, thieu uppercase, thieu special char")
        if "6-digit" in desc or lowered == "otp":
            items.append(f"{name}: 5/6/7 digits, ky tu khong phai so")
        if "date" in lowered:
            items.append(f"{name}: ISO hop le, ngay khong ton tai, timezone edge")
        if lowered == "color":
            items.append("color: #000000, #FFFFFF, #GGGGGG, 'red', payload CSS")
        if schema.get("type") == "number" or lowered.endswith("id") or lowered in {"newposition", "statusid"}:
            items.append(f"{name}: -1, 0, 1, so rat lon, decimal")
        if lowered == "file":
            items.append("file: 0 byte, 20MB, 20MB+1, MIME khong khop extension")
    if any(p.get("name") in {"page", "limit"} for p in params):
        items.append("page/limit: 1, 0, -1, limit rat lon")
    if any(p.get("in") == "path" and p.get("schema", {}).get("type") == "number" for p in params):
        ids = [p["name"] for p in params if p.get("in") == "path"]
        items.append("path id boundary cho " + ", ".join(ids) + ": 0, -1, 2147483647")
    if not items:
        items.append("lap lai request voi du lieu empty/min/max theo domain va id boundary")
    return "; ".join(dict.fromkeys(items))


def authentication_steps(api, op):
    label = f"{op['method']} {op['path']}"
    if api.requires_bearer(op):
        return f"Goi {label} khong co Authorization, Bearer rong, token het han va token sai signature."
    if op["path"] == "/auth/refresh":
        return "Goi refresh voi refreshToken hop le, het han, bi revoke va random string."
    if "login" in op["path"]:
        return "Login voi credential dung/sai, email chua verify va password sai."
    if "otp" in op["path"] or "verify" in op["path"]:
        return "Goi endpoint voi OTP/token dung, sai, het han va da su dung."
    return "Xac minh endpoint public khong yeu cau bearer token; gui Authorization gia mao khong lam thay doi logic."


def authentication_expected(api, op):
    if api.requires_bearer(op):
        return "401 - " + (api.response_description(op, 401) or "Unauthorized")
    if api.has_response(op, 401):
        return "Credential/token khong hop le tra 401; khong tra thong tin nhay cam."
    if api.has_response(op, 400):
        return "OTP/token/body khong hop le tra 400; request hop le khong can bearer token."
    return "Endpoint public xu ly dung theo business response, khong yeu cau JWT."


def authorization_steps(api, op):
    if api.requires_bearer(op):
        if api.has_response(op, 403):
            return "Dung token user hop le nhung khong phai owner/member/role duoc phep; thu ID resource cua user/project khac."
        return "Dung token user A truy cap resource cua user B hoac project khong lien quan de xac minh khong bi IDOR."
    return "Thu su dung email/OTP/token/reset token cua user khac de dam bao khong chiem quyen tai khoan."


def authorization_expected(api, op):
    if api.has_response(op, 403):
        return "403 - " + api.response_description(op, 403)
    if api.requires_bearer(op):
        return "Khong tra du lieu ngoai pham vi user; ket qua phu hop la 403/404 hoac filtered list."
    return "Khong cho chiem quyen tai khoan/flow cua user khac; thong tin nhay cam khong bi leak."


def security_steps(op):
    path = op["path"]
    label = f"{op['method']} {path}"
    if "attachments" in path or "attachment" in path:
        return f"{label}: upload/download voi MIME spoofing, filename '../a.exe', file script, file qua size; verify URL khong public vinh vien."
    if "comments" in path or "comment" in path:
        return f"{label}: content chua <script>, HTML, SQL payload, mention spam va very long unicode."
    if "tags" in path or "tag" in path:
        return f"{label}: name/color chua HTML/CSS injection, duplicate race condition va tagId cua project khac."
    if "auth" in path:
        return f"{label}: brute force, OTP enumeration, timing difference, token leakage trong response/log va replay token."
    if "notifications" in path:
        return f"{label}: IDOR notificationId, filter tampering va response khong leak payload user khac."
    if "activities" in path:
        return f"{label}: IDOR projectId/taskId va audit log khong chua secret/token."
    return f"{label}: IDOR tren path id, SQL/NoSQL injection trong string field, mass assignment va replay/race condition."


def security_expected(op):
    if "attachments" in op["path"] or "attachment" in op["path"]:
        return "File nguy hiem bi reject/quarantine; URL download chi cap cho user co quyen; khong path traversal."
    if "comments" in op["path"] or "comment" in op["path"]:
        return "Payload duoc sanitize/encode; khong XSS, khong mention/notification spam ngoai rule."
    if "auth" in op["path"]:
        return "Khong brute force duoc, response khong tiet lo user ton tai/password/OTP/token; token duoc revoke dung."
    return "Khong co IDOR/injection/mass assignment; response khong leak secret, stack trace hoac du lieu user khac."


def business_steps(op):
    return BUSINESS_RULES.get((op["method"], op["path"]), "Thuc thi cac rule business duoc mo ta trong summary va cac response 400/403/404/409 cua OpenAPI.")


def business_expected(api, op):
    pieces = []
    for code in ["400", "403", "404", "409", "429"]:
        if api.has_response(op, code):
            pieces.append(f"{code} {api.response_description(op, code)}")
    success_code, success_desc = api.success_response(op)
    if pieces:
        return f"Thanh cong: {success_code} {success_desc}; case vi pham rule tra " + "; ".join(pieces) + "."
    return f"Thanh cong: {success_code} {success_desc}; du lieu lien quan duoc cap nhat nhat quan."


def test_case_row(api, op, case_index, suffix, category):
    tc_id = f"TC-{MODULE_CODES.get(op['tag'], 'GEN')}-{case_index:03d}-{suffix}"
    if category == "Happy Path":
        pre = valid_precondition(api, op)
        steps = f"Goi `{api.operation_label(op)}` voi {valid_request_desc(api, op)}."
        code, desc = api.success_response(op)
        expected = f"{code} - {desc}; response dung schema/side effect mong doi."
    elif category == "Validation":
        pre = valid_precondition(api, op)
        steps = validation_steps(api, op)
        expected = expected_validation(api, op)
    elif category == "Boundary":
        pre = valid_precondition(api, op)
        steps = boundary_steps(api, op)
        expected = expected_boundary(api, op)
    elif category == "Authentication":
        pre = "Co/khong co credential/token tuy theo flow."
        steps = authentication_steps(api, op)
        expected = authentication_expected(api, op)
    elif category == "Authorization":
        pre = "Co it nhat 2 user va resource thuoc owner/project khac; token deu hop le."
        steps = authorization_steps(api, op)
        expected = authorization_expected(api, op)
    elif category == "Business Logic":
        pre = valid_precondition(api, op)
        steps = business_steps(op)
        expected = business_expected(api, op)
    else:
        pre = "Da co du lieu va user/token phu hop de thu payload tan cong co kiem soat."
        steps = security_steps(op)
        expected = security_expected(op)
    return f"| {tc_id} | {category} | {md(pre)} | {md(steps)} | {md(expected)} |"


def render_overview(api):
    info = api.spec.get("info", {})
    counter = Counter(op["tag"] for op in api.operations)
    lines = [
        "# Aurora API - Test Plan, Test Scenarios, Test Cases & API Documentation",
        "",
        f"- Source: `docs-json.json`",
        f"- Generated date: `{GENERATED_DATE}`",
        f"- API title: `{info.get('title', '')}`",
        f"- Description: {info.get('description', '')}",
        f"- Version: `{info.get('version', '')}`",
        f"- OpenAPI: `{api.spec.get('openapi', '')}`",
        f"- Paths: `{len(api.spec.get('paths', {}))}`",
        f"- Operations: `{len(api.operations)}`",
        f"- Schemas: `{len(api.schemas)}`",
        f"- Auth scheme: `bearer JWT` cho cac endpoint co `security: bearer`.",
        "",
        "> Ghi chu QA: OpenAPI hien tai chua mo ta day du `minLength`, `pattern`, default pagination, response schema va error body cho tat ca endpoint. Test case validation mac dinh ky vong `400 Bad Request` neu spec khong ghi ro status khac.",
        "",
        "## Module Overview",
        "",
        "| Module | Operations | Main Responsibility |",
        "|---|---:|---|",
    ]
    for module, ops in api.by_module.items():
        lines.append(f"| {md(module)} | {counter[module]} | {md(MODULE_DESCRIPTIONS.get(module, ''))} |")
    return "\n".join(lines)


def render_test_plan():
    return "\n".join(
        [
            "## Test Plan",
            "",
            "### Objectives",
            "",
            "- Xac minh API Aurora dap ung dung OpenAPI contract va cac business rule mo ta trong summary/response.",
            "- Bao phu happy path, validation, boundary, authentication, authorization, business logic va security cho tung endpoint.",
            "- Dam bao cac luong lien module nhu project -> checklist -> task -> comment/attachment/tag -> notification/activity log hoat dong nhat quan.",
            "",
            "### Scope In",
            "",
            "- REST API trong OpenAPI `Aurora API` version `1.0`.",
            "- JWT bearer authentication, role/project membership authorization va current-user data isolation.",
            "- CRUD/status/soft-delete/hard-delete, invitation, OTP, file upload, pagination va dashboard summary.",
            "",
            "### Scope Out",
            "",
            "- UI/Web frontend, email provider thuc te, Azure Blob infrastructure thuc te va performance/load test quy mo lon.",
            "- Database migration va internal implementation khong the quan sat qua API.",
            "",
            "### Test Strategy",
            "",
            "| Test Type | Approach |",
            "|---|---|",
            "| Contract | Kiem tra method/path/status/request schema/required field/content-type theo OpenAPI. |",
            "| Functional | Chay full flow theo module va cross-module flow project-checklist-task. |",
            "| Negative | Missing field, sai type, ID khong ton tai, invalid status/role/token. |",
            "| Boundary | Do dai max, min password/OTP, page/limit, file 20MB, position 0-based, ID boundary. |",
            "| AuthN/AuthZ | Missing/expired/malformed token, non-member, wrong role, owner-only/current-user-only. |",
            "| Security | IDOR, injection, XSS, mass assignment, replay/race, file upload attack, information leakage. |",
            "| Regression | Automation smoke cho P0/P1 va rerun khi thay doi controller/service/guard/DTO. |",
            "",
            "### Test Environment",
            "",
            "- Base URL: lay tu environment test/staging.",
            "- Database: test database co seed data rieng, reset duoc.",
            "- Mail/OTP: dung mail sandbox hoac test hook de doc OTP.",
            "- Storage: Azure Blob test container hoac mock storage co kha nang verify upload/delete.",
            "- Tools goi y: Postman/Newman, Jest/Supertest, k6 cho smoke load, OWASP ZAP cho security baseline.",
            "",
            "### Test Data",
            "",
            "| Data | Purpose |",
            "|---|---|",
            "| `owner@example.com` | Project creator/manager. |",
            "| `member@example.com` | Normal project member/assignee/comment owner. |",
            "| `outsider@example.com` | Authenticated user not in project for 403/IDOR. |",
            "| `admin@example.com`, `superadmin@example.com` | Role-based project/tag/member permission. |",
            "| Project active/archived/completed/deleted | Status transition and forbidden mutation. |",
            "| Checklist OPEN/IN_PROGRESS/DONE/deleted | Checklist status/delete rules. |",
            "| Task TODO/IN_PROGRESS/REVIEW/DONE/deleted | Task status/update/delete/summary. |",
            "| Files 0B, 1KB, 20MB, 20MB+1 | Attachment boundary/security. |",
            "",
            "### Entry Criteria",
            "",
            "- OpenAPI spec build thanh cong va test environment deploy dung version.",
            "- Co seed data/credential cho cac role va project membership can thiet.",
            "- Co cach lay OTP/invitation token/reset OTP trong moi truong test.",
            "",
            "### Exit Criteria",
            "",
            "- 100% P0 pass; khong con defect Critical/High dang open.",
            "- Tat ca endpoint co ket qua cho 7 nhom test case trong tai lieu nay.",
            "- Contract test va smoke regression chay thanh cong tren CI/staging.",
            "",
            "### Risks",
            "",
            "- Spec chua co response schema/error schema nen automation assertion body can bo sung sau khi quan sat implementation.",
            "- Default pagination/range limit chua ro, can xac nhan voi BE de chot expected.",
            "- Authorization phu thuoc roleId cu the nhung OpenAPI chua liet ke role catalog.",
        ]
    )


def render_api_documentation(api):
    lines = ["## API Documentation By Module", ""]
    for module, operations in api.by_module.items():
        lines.extend(
            [
                f"### {module}",
                "",
                MODULE_DESCRIPTIONS.get(module, ""),
                "",
                "| Method | Path | Auth | Summary |",
                "|---|---|---|---|",
            ]
        )
        for op in operations:
            auth = "Bearer JWT" if api.requires_bearer(op) else "Public/body token"
            lines.append(f"| `{op['method']}` | `{md(op['path'])}` | {auth} | {md(op['summary'])} |")
        lines.append("")
        for op in operations:
            operation = op["operation"]
            auth = "Bearer JWT required" if api.requires_bearer(op) else "No bearer JWT required"
            lines.extend(
                [
                    f"#### `{op['method']} {op['path']}`",
                    "",
                    f"- Summary: {md(op['summary'])}",
                    f"- Operation ID: `{operation.get('operationId', '')}`",
                    f"- Authentication: {auth}",
                    "",
                    "**Parameters**",
                    "",
                    parameter_table(api, op),
                    "",
                    "**Request Body**",
                    "",
                ]
            )
            bodies = api.request_bodies(op)
            if not bodies:
                lines.append("_Khong co request body._")
            else:
                for content_type, schema, required in bodies:
                    schema_name = ref_name(schema) or api.schema_type(schema)
                    lines.extend(
                        [
                            f"- Content-Type: `{content_type}`",
                            f"- Required: {'Yes' if required else 'No'}",
                            f"- Schema: `{schema_name}`",
                            "",
                            api.schema_table(schema),
                            "",
                            "**Sample**",
                            "",
                            api.sample_request(op),
                        ]
                    )
            lines.extend(
                [
                    "",
                    "**Responses**",
                    "",
                    status_table(op),
                    "",
                    "**QA Notes**",
                    "",
                ]
            )
            for note in operation_notes(api, op):
                lines.append(f"- {md(note)}")
            lines.append("")
    return "\n".join(lines)


def render_test_scenarios(api):
    lines = ["## Test Scenarios", ""]
    for module in api.by_module:
        lines.extend([f"### {module}", "", "| Scenario ID | Area | Scenario | APIs Covered | Priority |", "|---|---|---|---|---|"])
        for scenario in SCENARIOS.get(module, []):
            lines.append("| " + " | ".join(md(x) for x in scenario) + " |")
        lines.append("")
    return "\n".join(lines)


def render_test_cases(api):
    total = len(api.operations) * len(CATEGORIES)
    lines = [
        "## Test Cases",
        "",
        f"Coverage target: `{len(api.operations)}` operations x `{len(CATEGORIES)}` categories = `{total}` generated test cases.",
        "",
        "Legend: `HP` Happy Path, `VAL` Validation, `BND` Boundary, `AUTHN` Authentication, `AUTHZ` Authorization, `BL` Business Logic, `SEC` Security.",
        "",
    ]
    for module, operations in api.by_module.items():
        lines.extend([f"### {module}", ""])
        case_index = 1
        for op in operations:
            lines.extend(
                [
                    f"#### `{op['method']} {op['path']}`",
                    "",
                    "| Test Case ID | Category | Preconditions | Steps / Test Data | Expected Result |",
                    "|---|---|---|---|---|",
                ]
            )
            for suffix, category in CATEGORIES:
                lines.append(test_case_row(api, op, case_index, suffix, category))
                case_index += 1
            lines.append("")
    return "\n".join(lines)


def render_schema_appendix(api):
    lines = ["## Data Schema Appendix", ""]
    for name, schema in api.schemas.items():
        lines.extend([f"### `{name}`", "", api.schema_table(schema), ""])
    return "\n".join(lines)


def main():
    spec = load_spec()
    api = OpenApiDoc(spec)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    document = "\n\n".join(
        [
            render_overview(api),
            render_test_plan(),
            render_api_documentation(api),
            render_test_scenarios(api),
            render_test_cases(api),
            render_schema_appendix(api),
        ]
    )
    OUT_PATH.write_text(document + "\n", encoding="utf-8")
    print(f"Wrote {OUT_PATH}")
    print(f"Operations: {len(api.operations)}")
    print(f"Test cases: {len(api.operations) * len(CATEGORIES)}")


if __name__ == "__main__":
    main()
