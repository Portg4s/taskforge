package com.taskforge.api.board;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.taskforge.api.auth.DevUserProvider;
import com.taskforge.api.board.dto.BoardColumnResponse;
import com.taskforge.api.board.dto.CreateBoardColumnRequest;
import com.taskforge.api.board.dto.ReorderBoardColumnsRequest;
import com.taskforge.api.board.dto.UpdateBoardColumnRequest;
import com.taskforge.api.user.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BoardColumnService {

	private final BoardRepository boardRepository;
	private final BoardColumnRepository boardColumnRepository;
	private final DevUserProvider devUserProvider;

	public BoardColumnService(
			BoardRepository boardRepository,
			BoardColumnRepository boardColumnRepository,
			DevUserProvider devUserProvider) {
		this.boardRepository = boardRepository;
		this.boardColumnRepository = boardColumnRepository;
		this.devUserProvider = devUserProvider;
	}

	@Transactional
	public List<BoardColumnResponse> listColumns(UUID boardId) {
		User currentUser = devUserProvider.getCurrentUser();
		Board board = findOwnedBoard(boardId, currentUser);

		return findColumns(board).stream()
				.map(this::toResponse)
				.toList();
	}

	@Transactional
	public BoardColumnResponse createColumn(UUID boardId, CreateBoardColumnRequest request) {
		User currentUser = devUserProvider.getCurrentUser();
		Board board = findOwnedBoard(boardId, currentUser);
		int nextPosition = findColumns(board).stream()
				.mapToInt(BoardColumn::getPosition)
				.max()
				.orElse(-1) + 1;
		BoardColumn column = boardColumnRepository.save(new BoardColumn(request.name().trim(), nextPosition, board));

		return toResponse(column);
	}

	@Transactional
	public BoardColumnResponse updateColumn(UUID columnId, UpdateBoardColumnRequest request) {
		User currentUser = devUserProvider.getCurrentUser();
		BoardColumn column = findOwnedColumn(columnId, currentUser);

		if (request.name() != null) {
			String trimmedName = request.name().trim();
			if (trimmedName.isBlank()) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Column name must not be blank");
			}
			column.setName(trimmedName);
		}

		return toResponse(column);
	}

	@Transactional
	public List<BoardColumnResponse> reorderColumns(UUID boardId, ReorderBoardColumnsRequest request) {
		User currentUser = devUserProvider.getCurrentUser();
		Board board = findOwnedBoard(boardId, currentUser);
		List<BoardColumn> columns = findColumns(board);
		List<UUID> requestedIds = request.columnIds();

		validateRequestedOrder(columns, requestedIds);

		Map<UUID, BoardColumn> columnsById = columns.stream()
				.collect(Collectors.toMap(BoardColumn::getId, Function.identity()));

		for (int position = 0; position < requestedIds.size(); position++) {
			columnsById.get(requestedIds.get(position)).setPosition(position);
		}

		return requestedIds.stream()
				.map(columnsById::get)
				.map(this::toResponse)
				.toList();
	}

	@Transactional
	public void deleteColumn(UUID columnId) {
		User currentUser = devUserProvider.getCurrentUser();
		BoardColumn column = findOwnedColumn(columnId, currentUser);

		// Later, when tasks are active, deletion must prevent or handle columns containing tasks.
		boardColumnRepository.delete(column);
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

	private List<BoardColumn> findColumns(Board board) {
		return boardColumnRepository.findByBoardIdOrderByPositionAsc(board.getId());
	}

	private void validateRequestedOrder(List<BoardColumn> columns, List<UUID> requestedIds) {
		if (requestedIds.size() != columns.size()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Column order must include every board column exactly once");
		}

		HashSet<UUID> uniqueRequestedIds = new HashSet<>(requestedIds);
		if (uniqueRequestedIds.size() != requestedIds.size()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Column order must not contain duplicates");
		}

		HashSet<UUID> existingIds = columns.stream()
				.map(BoardColumn::getId)
				.collect(Collectors.toCollection(HashSet::new));

		if (!existingIds.equals(uniqueRequestedIds)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Column order must include only columns from this board");
		}
	}

	private BoardColumnResponse toResponse(BoardColumn column) {
		return new BoardColumnResponse(
				column.getId(),
				column.getName(),
				column.getPosition(),
				column.getCreatedAt(),
				column.getUpdatedAt());
	}
}
