package com.taskforge.api.board;

import java.util.List;
import java.util.UUID;

import com.taskforge.api.auth.DevUserProvider;
import com.taskforge.api.board.dto.BoardColumnResponse;
import com.taskforge.api.board.dto.BoardResponse;
import com.taskforge.api.board.dto.CreateBoardRequest;
import com.taskforge.api.board.dto.UpdateBoardRequest;
import com.taskforge.api.project.Project;
import com.taskforge.api.project.ProjectRepository;
import com.taskforge.api.task.TaskRepository;
import com.taskforge.api.user.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BoardService {

	private static final List<String> DEFAULT_COLUMN_NAMES = List.of("Todo", "In Progress", "Done");

	private final BoardRepository boardRepository;
	private final BoardColumnRepository boardColumnRepository;
	private final ProjectRepository projectRepository;
	private final TaskRepository taskRepository;
	private final DevUserProvider devUserProvider;

	public BoardService(
			BoardRepository boardRepository,
			BoardColumnRepository boardColumnRepository,
			ProjectRepository projectRepository,
			TaskRepository taskRepository,
			DevUserProvider devUserProvider) {
		this.boardRepository = boardRepository;
		this.boardColumnRepository = boardColumnRepository;
		this.projectRepository = projectRepository;
		this.taskRepository = taskRepository;
		this.devUserProvider = devUserProvider;
	}

	@Transactional
	public List<BoardResponse> listBoards(UUID projectId) {
		User currentUser = devUserProvider.getCurrentUser();
		Project project = findOwnedProject(projectId, currentUser);

		return boardRepository.findByProjectId(project.getId()).stream()
				.map(this::toResponse)
				.toList();
	}

	@Transactional
	public BoardResponse createBoard(UUID projectId, CreateBoardRequest request) {
		User currentUser = devUserProvider.getCurrentUser();
		Project project = findOwnedProject(projectId, currentUser);
		Board board = boardRepository.save(new Board(request.name(), project));

		for (int position = 0; position < DEFAULT_COLUMN_NAMES.size(); position++) {
			boardColumnRepository.save(new BoardColumn(DEFAULT_COLUMN_NAMES.get(position), position, board));
		}

		return toResponse(board);
	}

	@Transactional
	public BoardResponse getBoard(UUID boardId) {
		User currentUser = devUserProvider.getCurrentUser();

		return toResponse(findOwnedBoard(boardId, currentUser));
	}

	@Transactional
	public BoardResponse updateBoard(UUID boardId, UpdateBoardRequest request) {
		User currentUser = devUserProvider.getCurrentUser();
		Board board = findOwnedBoard(boardId, currentUser);

		if (request.name() != null) {
			String trimmedName = request.name().trim();
			if (trimmedName.isBlank()) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Board name must not be blank");
			}
			board.setName(trimmedName);
		}

		return toResponse(board);
	}

	@Transactional
	public void deleteBoard(UUID boardId) {
		User currentUser = devUserProvider.getCurrentUser();
		Board board = findOwnedBoard(boardId, currentUser);

		if (taskRepository.existsByBoardId(board.getId())) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Board contains tasks and cannot be deleted");
		}

		boardColumnRepository.deleteByBoardId(board.getId());
		boardRepository.delete(board);
	}

	private Project findOwnedProject(UUID projectId, User currentUser) {
		return projectRepository.findById(projectId)
				.filter(project -> project.getOwner().getId().equals(currentUser.getId()))
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
	}

	private Board findOwnedBoard(UUID boardId, User currentUser) {
		return boardRepository.findById(boardId)
				.filter(board -> board.getProject().getOwner().getId().equals(currentUser.getId()))
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Board not found"));
	}

	private BoardResponse toResponse(Board board) {
		List<BoardColumnResponse> columns = boardColumnRepository.findByBoardIdOrderByPositionAsc(board.getId()).stream()
				.map(this::toColumnResponse)
				.toList();

		return new BoardResponse(
				board.getId(),
				board.getName(),
				board.getProject().getId(),
				columns,
				board.getCreatedAt(),
				board.getUpdatedAt());
	}

	private BoardColumnResponse toColumnResponse(BoardColumn column) {
		return new BoardColumnResponse(
				column.getId(),
				column.getName(),
				column.getPosition(),
				column.getCreatedAt(),
				column.getUpdatedAt());
	}
}
