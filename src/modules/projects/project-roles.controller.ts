import { Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';

@ApiTags('Project Roles')
@Controller('project-roles')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ProjectRolesController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get assignable project roles' })
  @ApiResponse({ status: 200, description: 'Project roles returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll() {
    return this.projectsService.findProjectRoles();
  }
}