package com.taskforge.api.task;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.taskforge.api.auth.CurrentUserProvider;
import com.taskforge.api.board.Board;
import com.taskforge.api.board.BoardColumn;
import com.taskforge.api.board.BoardColumnRepository;
import com.taskforge.api.board.BoardRepository;
import com.taskforge.api.task.dto.CreateTaskRequest;
import com.taskforge.api.task.dto.MoveTaskRequest;
import com.taskforge.api.task.dto.TaskResponse;
import com.taskforge.api.task.dto.UpdateTaskRequest;
import com.taskforge.api.user.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TaskService {

	private final TaskRepository taskRepository;
	private final BoardRepository boardRepository;
	private final BoardColumnRepository boardColumnRepository;
	private final CurrentUserProvider currentUserProvider;

	public TaskService(
			TaskRepository taskRepository,
			BoardRepository boardRepository,
			BoardColumnRepository boardColumnRepository,
			CurrentUserProvider currentUserProvider) {
		this.taskRepository = taskRepository;
		this.boardRepository = boardRepository;
		this.boardColumnRepository = boardColumnRepository;
		this.currentUserProvider = currentUserProvider;
	}

	@Transactional
	public List<TaskResponse> listBoardTasks(UUID boardId) {
		User currentUser = currentUserProvider.getCurrentUser();
		Board board = findOwnedBoard(boardId, currentUser);

		return taskRepository.findByBoardIdOrderByPositionAsc(board.getId()).stream()
				.map(this::toResponse)
				.toList();
	}

	@Transactional
	public List<TaskResponse> listColumnTasks(UUID columnId) {
		User currentUser = currentUserProvider.getCurrentUser();
		BoardColumn column = findOwnedColumn(columnId, currentUser);

		return findColumnTasks(column).stream()
				.map(this::toResponse)
				.toList();
	}

	@Transactional
	public TaskResponse createTask(UUID columnId, CreateTaskRequest request) {
		User currentUser = currentUserProvider.getCurrentUser();
		BoardColumn column = findOwnedColumn(columnId, currentUser);
		int nextPosition = findColumnTasks(column).stream()
				.mapToInt(Task::getPosition)
				.max()
				.orElse(-1) + 1;

		Task task = taskRepository.save(new Task(
				request.title().trim(),
				request.description(),
				request.priority(),
				request.dueDate(),
				nextPosition,
				column.getBoard(),
				column,
				null));

		return toResponse(task);
	}

	@Transactional
	public TaskResponse getTask(UUID taskId) {
		User currentUser = currentUserProvider.getCurrentUser();

		return toResponse(findOwnedTask(taskId, currentUser));
	}

	@Transactional
	public TaskResponse updateTask(UUID taskId, UpdateTaskRequest request) {
		User currentUser = currentUserProvider.getCurrentUser();
		Task task = findOwnedTask(taskId, currentUser);

		if (request.title() != null) {
			String trimmedTitle = request.title().trim();
			if (trimmedTitle.isBlank()) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Task title must not be blank");
			}
			task.setTitle(trimmedTitle);
		}
		if (request.description() != null) {
			task.setDescription(request.description());
		}
		if (request.priority() != null) {
			task.setPriority(request.priority());
		}
		if (request.dueDate() != null) {
			task.setDueDate(request.dueDate());
		}

		return toResponse(task);
	}

	@Transactional
	public TaskResponse moveTask(UUID taskId, MoveTaskRequest request) {
		User currentUser = currentUserProvider.getCurrentUser();
		Task task = findOwnedTask(taskId, currentUser);
		BoardColumn targetColumn = findOwnedColumn(request.columnId(), currentUser);

		if (!targetColumn.getBoard().getId().equals(task.getBoard().getId())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Target column must belong to the same board");
		}

		BoardColumn sourceColumn = task.getColumn();
		if (sourceColumn.getId().equals(targetColumn.getId())) {
			reorderWithinColumn(task, targetColumn, request.position());
		} else {
			moveToAnotherColumn(task, sourceColumn, targetColumn, request.position());
		}

		return toResponse(task);
	}

	@Transactional
	public void deleteTask(UUID taskId) {
		User currentUser = currentUserProvider.getCurrentUser();
		Task task = findOwnedTask(taskId, currentUser);
		BoardColumn column = task.getColumn();

		taskRepository.delete(task);
		taskRepository.flush();
		compactColumn(column);
	}

	private Board findOwnedBoard(UUID boardId, User currentUser) {
		return boardRepository.findById(boardId)
				.filter(board -> board.getProject().getOwner().getId().equals(currentUser.getId()))
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Board not found"));
	}

	private BoardColumn findOwnedColumn(UUID columnId, User currentUser) {
		return boardColumnRepository.findById(columnId)
				.filter(column -> column.getBoard().getProject().getOwner().getId().equals(currentUser.getId()))
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Column not found"));
	}

	private Task findOwnedTask(UUID taskId, User currentUser) {
		return taskRepository.findById(taskId)
				.filter(task -> task.getBoard().getProject().getOwner().getId().equals(currentUser.getId()))
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
	}

	private List<Task> findColumnTasks(BoardColumn column) {
		return taskRepository.findByColumnIdOrderByPositionAsc(column.getId());
	}

	private void reorderWithinColumn(Task task, BoardColumn column, int requestedPosition) {
		List<Task> tasks = new ArrayList<>(findColumnTasks(column));
		tasks.removeIf(candidate -> candidate.getId().equals(task.getId()));
		tasks.add(Math.min(requestedPosition, tasks.size()), task);
		reindex(tasks);
	}

	private void moveToAnotherColumn(Task task, BoardColumn sourceColumn, BoardColumn targetColumn, int requestedPosition) {
		List<Task> sourceTasks = new ArrayList<>(findColumnTasks(sourceColumn));
		sourceTasks.removeIf(candidate -> candidate.getId().equals(task.getId()));
		reindex(sourceTasks);

		List<Task> targetTasks = new ArrayList<>(findColumnTasks(targetColumn));
		task.setColumn(targetColumn);
		task.setBoard(targetColumn.getBoard());
		targetTasks.add(Math.min(requestedPosition, targetTasks.size()), task);
		reindex(targetTasks);
	}

	private void compactColumn(BoardColumn column) {
		reindex(new ArrayList<>(findColumnTasks(column)));
	}

	private void reindex(List<Task> tasks) {
		for (int position = 0; position < tasks.size(); position++) {
			tasks.get(position).setPosition(position);
		}
	}

	private TaskResponse toResponse(Task task) {
		UUID assigneeId = task.getAssignee() == null ? null : task.getAssignee().getId();

		return new TaskResponse(
				task.getId(),
				task.getTitle(),
				task.getDescription(),
				task.getPriority(),
				task.getDueDate(),
				task.getPosition(),
				task.getBoard().getId(),
				task.getColumn().getId(),
				assigneeId,
				task.getCreatedAt(),
				task.getUpdatedAt());
	}
}
