package com.taskforge.api.board;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.taskforge.api.board.dto.BoardResponse;
import com.taskforge.api.board.dto.CreateBoardRequest;
import com.taskforge.api.board.dto.UpdateBoardRequest;
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
public class BoardController {

	private final BoardService boardService;

	public BoardController(BoardService boardService) {
		this.boardService = boardService;
	}

	@GetMapping("/projects/{projectId}/boards")
	public List<BoardResponse> listBoards(@PathVariable UUID projectId) {
		return boardService.listBoards(projectId);
	}

	@PostMapping("/projects/{projectId}/boards")
	public ResponseEntity<BoardResponse> createBoard(
			@PathVariable UUID projectId,
			@Valid @RequestBody CreateBoardRequest request) {
		BoardResponse response = boardService.createBoard(projectId, request);

		return ResponseEntity.created(URI.create("/api/boards/" + response.id()))
				.body(response);
	}

	@GetMapping("/boards/{boardId}")
	public BoardResponse getBoard(@PathVariable UUID boardId) {
		return boardService.getBoard(boardId);
	}

	@PatchMapping("/boards/{boardId}")
	public BoardResponse updateBoard(
			@PathVariable UUID boardId,
			@Valid @RequestBody UpdateBoardRequest request) {
		return boardService.updateBoard(boardId, request);
	}

	@DeleteMapping("/boards/{boardId}")
	public ResponseEntity<Void> deleteBoard(@PathVariable UUID boardId) {
		boardService.deleteBoard(boardId);

		return ResponseEntity.noContent().build();
	}
}
