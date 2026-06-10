package com.taskforge.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;

import com.taskforge.api.board.Board;
import com.taskforge.api.board.BoardColumn;
import com.taskforge.api.board.BoardColumnRepository;
import com.taskforge.api.board.BoardRepository;
import com.taskforge.api.project.Project;
import com.taskforge.api.project.ProjectRepository;
import com.taskforge.api.task.Task;
import com.taskforge.api.task.TaskPriority;
import com.taskforge.api.task.TaskRepository;
import com.taskforge.api.user.User;
import com.taskforge.api.user.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class DomainRepositoryTest {

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private ProjectRepository projectRepository;

	@Autowired
	private BoardRepository boardRepository;

	@Autowired
	private BoardColumnRepository boardColumnRepository;

	@Autowired
	private TaskRepository taskRepository;

	@Autowired
	private EntityManager entityManager;

	@Test
	void persistsCoreDomainGraph() {
		User owner = userRepository.save(new User("owner@example.com", "Project Owner", null));
		Project project = projectRepository.save(new Project("TaskForge", "Core planning", owner));
		Board board = boardRepository.save(new Board("Main board", project));
		BoardColumn todo = boardColumnRepository.save(new BoardColumn("Todo", 0, board));
		boardColumnRepository.save(new BoardColumn("Done", 1, board));

		Task task = taskRepository.save(new Task(
				"Prepare domain model",
				"Create the first JPA entities",
				TaskPriority.HIGH,
				LocalDate.now().plusDays(7),
				0,
				board,
				todo,
				owner));

		entityManager.flush();
		entityManager.clear();

		Task savedTask = taskRepository.findById(task.getId()).orElseThrow();

		assertThat(userRepository.findByEmail("owner@example.com")).isPresent();
		assertThat(projectRepository.findByOwnerId(owner.getId())).hasSize(1);
		assertThat(boardRepository.findByProjectId(project.getId())).hasSize(1);
		assertThat(boardColumnRepository.findByBoardIdOrderByPositionAsc(board.getId()))
				.extracting(BoardColumn::getName)
				.containsExactly("Todo", "Done");
		assertThat(taskRepository.findByBoardId(board.getId())).hasSize(1);
		assertThat(savedTask.getPriority()).isEqualTo(TaskPriority.HIGH);
		assertThat(savedTask.getColumn().getId()).isEqualTo(todo.getId());
		assertThat(savedTask.getAssignee().getId()).isEqualTo(owner.getId());
		assertThat(savedTask.getCreatedAt()).isNotNull();
		assertThat(savedTask.getUpdatedAt()).isNotNull();
	}
}
