package za.co.astutefunerals.messages;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ContactMessageRepository extends JpaRepository<ContactMessage, Long> {

	@EntityGraph(attributePaths = "replies")
	List<ContactMessage> findTop200ByOrderByCreatedAtDesc();

	long countByReadFalse();

	@Query("select count(m) from ContactMessage m where m.replies is empty")
	long countAwaitingReply();

}
