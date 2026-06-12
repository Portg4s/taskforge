package com.taskforge.api.project;

import java.util.List;
import java.util.UUID;

import com.taskforge.api.auth.CurrentUserProvider;
import com.taskforge.api.board.BoardRepository;
import com.taskforge.api.project.dto.CreateProjectRequest;
import com.taskforge.api.project.dto.ProjectResponse;
import com.taskforge.api.project.dto.UpdateProjectRequest;
import com.taskforge.api.task.TaskRepository;
import com.taskforge.api.user.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProjectService {

	private final ProjectRepository projectRepository;
	private final BoardRepository boardRepository;
	private final TaskRepository taskRepository;
	private final CurrentUserProvider currentUserProvider;

	public ProjectService(
			ProjectRepository projectRepository,
			BoardRepository boardRepository,
			TaskRepository taskRepository,
			CurrentUserProvider currentUserProvider) {
		this.projectRepository = projectRepository;
		this.boardRepository = boardRepository;
		this.taskRepository = taskRepository;
		this.currentUserProvider = currentUserProvider;
	}

	@Transactional
	public List<ProjectResponse> listProjects() {
		User currentUser = currentUserProvider.getCurrentUser();

		return projectRepository.findByOwnerId(currentUser.getId()).stream()
				.map(this::toResponse)
				.toList();
	}

	@Transactional
	public ProjectResponse createProject(CreateProjectRequest request) {
		User currentUser = currentUserProvider.getCurrentUser();
		Project project = new Project(request.name(), request.description(), currentUser);

		return toResponse(projectRepository.save(project));
	}

	@Transactional
	public ProjectResponse getProject(UUID id) {
		User currentUser = currentUserProvider.getCurrentUser();

		return toResponse(findOwnedProject(id, currentUser));
	}

	@Transactional
	public ProjectResponse updateProject(UUID id, UpdateProjectRequest request) {
		User currentUser = currentUserProvider.getCurrentUser();
		Project project = findOwnedProject(id, currentUser);

		if (request.name() != null) {
			String trimmedName = request.name().trim();
			if (trimmedName.isBlank()) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Project name must not be blank");
			}
			project.setName(trimmedName);
		}

		if (request.description() != null) {
			project.setDescription(request.description());
		}

		return toResponse(project);
	}

	@Transactional
	public void deleteProject(UUID id) {
		User currentUser = currentUserProvider.getCurrentUser();
		Project project = findOwnedProject(id, currentUser);

		if (taskRepository.existsByBoardProjectId(project.getId())) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Project contains tasks and cannot be deleted");
		}
		if (!boardRepository.findByProjectId(project.getId()).isEmpty()) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Project contains boards and cannot be deleted");
		}

		projectRepository.delete(project);
	}

	private Project findOwnedProject(UUID id, User currentUser) {
		return projectRepository.findById(id)
				.filter(project -> project.getOwner().getId().equals(currentUser.getId()))
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
	}

	private ProjectResponse toResponse(Project project) {
		return new ProjectResponse(
				project.getId(),
				project.getName(),
				project.getDescription(),
				project.getOwner().getId(),
				project.getCreatedAt(),
				project.getUpdatedAt());
	}
}
