package com.taskforge.api.board;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.taskforge.api.board.dto.BoardColumnResponse;
import com.taskforge.api.board.dto.CreateBoardColumnRequest;
import com.taskforge.api.board.dto.ReorderBoardColumnsRequest;
import com.taskforge.api.board.dto.UpdateBoardColumnRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class BoardColumnController {

	private final BoardColumnService boardColumnService;

	public BoardColumnController(BoardColumnService boardColumnService) {
		this.boardColumnService = boardColumnService;
	}

	@GetMapping("/boards/{boardId}/columns")
	public List<BoardColumnResponse> listColumns(@PathVariable UUID boardId) {
		return boardColumnService.listColumns(boardId);
	}

	@PostMapping("/boards/{boardId}/columns")
	public ResponseEntity<BoardColumnResponse> createColumn(
			@PathVariable UUID boardId,
			@Valid @RequestBody CreateBoardColumnRequest request) {
		BoardColumnResponse response = boardColumnService.createColumn(boardId, request);

		return ResponseEntity.created(URI.create("/api/board-columns/" + response.id()))
				.body(response);
	}

	@PatchMapping("/board-columns/{columnId}")
	public BoardColumnResponse updateColumn(
			@PathVariable UUID columnId,
			@Valid @RequestBody UpdateBoardColumnRequest request) {
		return boardColumnService.updateColumn(columnId, request);
	}

	@PatchMapping("/boards/{boardId}/columns/reorder")
	public List<BoardColumnResponse> reorderColumns(
			@PathVariable UUID boardId,
			@Valid @RequestBody ReorderBoardColumnsRequest request) {
		return boardColumnService.reorderColumns(boardId, request);
	}

	@DeleteMapping("/board-columns/{columnId}")
	public ResponseEntity<Void> deleteColumn(@PathVariable UUID columnId) {
		boardColumnService.deleteColumn(columnId);

		return ResponseEntity.noContent().build();
	}
}
