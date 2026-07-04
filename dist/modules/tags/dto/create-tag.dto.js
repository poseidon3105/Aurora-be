"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateTagDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateTagDto {
}
exports.CreateTagDto = CreateTagDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Tag name',
        example: 'Backend',
        maxLength: 100,
    }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Tag name must not be empty' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100, { message: 'Tag name must not exceed 100 characters' }),
    __metadata("design:type", String)
], CreateTagDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'HEX color code',
        example: '#2ecc71',
    }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Color must not be empty' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, {
        message: 'Color must be a valid HEX color code (e.g., #3498db)',
    }),
    __metadata("design:type", String)
], CreateTagDto.prototype, "color", void 0);
//# sourceMappingURL=create-tag.dto.js.map